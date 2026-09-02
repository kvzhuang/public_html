import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ── Noise ─────────────────────────────────────────────────────────────────────
const lerp = (a, b, t) => a + (b - a) * t;
const sm   = t => t * t * (3 - 2 * t);
function hash3(x, y, z) {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return n - Math.floor(n);
}
function valueNoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = sm(x-ix), fy = sm(y-iy), fz = sm(z-iz);
  return lerp(
    lerp(lerp(hash3(ix,  iy,  iz  ), hash3(ix+1,iy,  iz  ), fx),
         lerp(hash3(ix,  iy+1,iz  ), hash3(ix+1,iy+1,iz  ), fx), fy),
    lerp(lerp(hash3(ix,  iy,  iz+1), hash3(ix+1,iy,  iz+1), fx),
         lerp(hash3(ix,  iy+1,iz+1), hash3(ix+1,iy+1,iz+1), fx), fy), fz);
}
function fbm(x, y, z, oct = 7) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += valueNoise(x*f,y*f,z*f)*a; a*=0.5; f*=2.1; }
  return v;
}

// ── fxhash RNG (terrain seed) ─────────────────────────────────────────────────
const rand  = () => fxrand();
const rr    = (a, b) => a + rand() * (b - a);
const ri    = (a, b) => Math.floor(a + rand() * (b - a + 1));
const pick  = arr => arr[ri(0, arr.length - 1)];
// Game RNG (not seeded) for dynamic events
const gr    = () => Math.random();
const grr   = (a, b) => a + gr() * (b - a);
const gri   = (a, b) => Math.floor(a + gr() * (b - a + 1));
const gpick = arr => arr[gri(0, arr.length - 1)];

// ── Planet config ─────────────────────────────────────────────────────────────
const BASE_R  = 10;
const H_SCALE = 0.20;
const SEA_H   = rr(0.38, 0.50);
const NF      = rr(1.1, 1.9);
const SX = rr(0,60), SY = rr(0,60), SZ = rr(0,60);

const PALETTES = [
  { name:'翠綠星球', deep:'#0d2240', shallow:'#1a5488', sand:'#d4b87a', grass:'#3a7830', forest:'#1e5520', rock:'#6a5840', snow:'#eef2ff', water:'#1a6090', atmo:new THREE.Color('#5599dd'), sunCol:'#fffde8', treeTrunk:'#7a5230', treeLeaf:'#2a6830', houseWall:'#e8d8c0', houseRoof:'#8b3a2a' },
  { name:'火焰星球', deep:'#1a0400', shallow:'#4a1200', sand:'#884422', grass:'#772808', forest:'#551400', rock:'#442010', snow:'#ffcc66', water:'#bb3300', atmo:new THREE.Color('#ff6622'), sunCol:'#ffd0aa', treeTrunk:'#441800', treeLeaf:'#772200', houseWall:'#cc9966', houseRoof:'#661100' },
  { name:'沙漠星球', deep:'#1a0e00', shallow:'#3a2800', sand:'#cc9944', grass:'#997730', forest:'#664e18', rock:'#554828', snow:'#f0dfa8', water:'#664400', atmo:new THREE.Color('#ddaa44'), sunCol:'#fff2cc', treeTrunk:'#664400', treeLeaf:'#aa8833', houseWall:'#d4b870', houseRoof:'#885522' },
  { name:'冰雪星球', deep:'#060d18', shallow:'#12304a', sand:'#8aa8b8', grass:'#6080a0', forest:'#3a5878', rock:'#304050', snow:'#f0f8ff', water:'#1a3c60', atmo:new THREE.Color('#77bbff'), sunCol:'#ddeeff', treeTrunk:'#334455', treeLeaf:'#3a6080', houseWall:'#d0e8f0', houseRoof:'#4466aa' },
  { name:'紫晶星球', deep:'#0e0020', shallow:'#2a0a50', sand:'#8855aa', grass:'#5533aa', forest:'#3322aa', rock:'#442266', snow:'#ddc8ff', water:'#3311aa', atmo:new THREE.Color('#aa66ff'), sunCol:'#ffe8ff', treeTrunk:'#442266', treeLeaf:'#6644cc', houseWall:'#c8aadd', houseRoof:'#6633aa' },
];

const P   = pick(PALETTES);
const hex = k => new THREE.Color(P[k]);

function getH(nx, ny, nz) { return fbm(nx*NF+SX, ny*NF+SY, nz*NF+SZ); }
function getR(h) {
  if (h <= SEA_H) { const t = h/SEA_H; return BASE_R*(1 - H_SCALE*0.35*(1 - t*t)); }
  const t = (h-SEA_H)/(1-SEA_H);
  return BASE_R*(1 + H_SCALE*Math.pow(t, 0.8));
}
function biomeCol(h) {
  const d = h - SEA_H;
  if (d < -0.10) return hex('deep');
  if (d < 0)     return hex('shallow');
  if (d < 0.02)  return hex('sand');
  if (d < 0.13)  return hex('grass');
  if (d < 0.28)  return hex('forest');
  if (d < 0.42)  return hex('rock');
  return hex('snow');
}

// ── Renderer & Scene ──────────────────────────────────────────────────────────
const isMobile = innerWidth < 768;
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(0, 8, 26);

const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
document.body.appendChild(renderer.domElement);

// Background star sphere
const bgGeo = new THREE.SphereGeometry(500, 32, 16); bgGeo.scale(-1, 1, 1);
scene.add(new THREE.Mesh(bgGeo, new THREE.MeshBasicMaterial({ color: 0x000008 })));

// Star particles
{
  const N = 3000;
  const pos = new Float32Array(N*3), col = new Float32Array(N*3);
  for (let i = 0; i < N; i++) {
    const phi = Math.acos(rr(-1,1)), th = rr(0,Math.PI*2), r = rr(180,450);
    pos[i*3]=r*Math.sin(phi)*Math.cos(th); pos[i*3+1]=r*Math.cos(phi); pos[i*3+2]=r*Math.sin(phi)*Math.sin(th);
    const br = rr(0.4,1); col[i*3]=col[i*3+1]=col[i*3+2]=br;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos,3));
  g.setAttribute('color',    new THREE.BufferAttribute(col,3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ vertexColors:true, size:0.5, sizeAttenuation:true })));
}

// ── Lights ────────────────────────────────────────────────────────────────────
const sun = new THREE.DirectionalLight(new THREE.Color(P.sunCol), 1.3);
sun.position.set(28,18,12); sun.castShadow = true;
sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.near=1; sun.shadow.camera.far=80;
sun.shadow.camera.left=sun.shadow.camera.bottom=-18;
sun.shadow.camera.right=sun.shadow.camera.top=18;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xaabbcc, 0x886655, 1.1));
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
fillLight.position.set(-20,-10,-10); scene.add(fillLight);

// Flash light for lightning & meteor impact
const flashLight = new THREE.PointLight(0xaaddff, 0, 30);
scene.add(flashLight);

// ── Planet terrain ────────────────────────────────────────────────────────────
const SEG = isMobile ? 72 : 108;
const planetGeo = new THREE.SphereGeometry(BASE_R, SEG, SEG/2);
const posAttr = planetGeo.attributes.position;
const N_VERT  = posAttr.count;
const colArr  = new Float32Array(N_VERT*3);
const colAttr = new THREE.BufferAttribute(colArr, 3);
planetGeo.setAttribute('color', colAttr);

const tmpV = new THREE.Vector3();
for (let i = 0; i < N_VERT; i++) {
  tmpV.fromBufferAttribute(posAttr, i);
  const len = tmpV.length();
  const nx=tmpV.x/len, ny=tmpV.y/len, nz=tmpV.z/len;
  const h = getH(nx,ny,nz), r = getR(h);
  posAttr.setXYZ(i, nx*r, ny*r, nz*r);
  const col = biomeCol(h);
  colArr[i*3]=col.r; colArr[i*3+1]=col.g; colArr[i*3+2]=col.b;
}
posAttr.needsUpdate = true; colAttr.needsUpdate = true;
planetGeo.computeVertexNormals();
const planet = new THREE.Mesh(planetGeo, new THREE.MeshLambertMaterial({ vertexColors:true }));
planet.castShadow = planet.receiveShadow = true;
scene.add(planet);

// ── Ocean ─────────────────────────────────────────────────────────────────────
const oceanMat = new THREE.MeshPhongMaterial({
  color: new THREE.Color(P.water), transparent:true, opacity:0.72,
  shininess:120, specular: new THREE.Color('#99ccff'),
});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(BASE_R*1.002, 64, 32), oceanMat));

// ── Atmosphere ────────────────────────────────────────────────────────────────
const atmoMat = new THREE.ShaderMaterial({
  uniforms: { atmoColor: { value: P.atmo } },
  vertexShader: `varying vec3 vN,vV;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
  fragmentShader: `uniform vec3 atmoColor;varying vec3 vN,vV;void main(){float r=1.-max(0.,dot(vN,vV));r=pow(r,3.5);gl_FragColor=vec4(atmoColor,r*0.55);}`,
  transparent:true, depthWrite:false, side:THREE.FrontSide, blending:THREE.AdditiveBlending,
});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(BASE_R*1.30, 36, 18), atmoMat));
const iAtmoMat = atmoMat.clone();
iAtmoMat.uniforms = { atmoColor: { value: P.atmo.clone().multiplyScalar(0.5) } };
scene.add(new THREE.Mesh(new THREE.SphereGeometry(BASE_R*1.10, 36, 18), iAtmoMat));

// ── Surface helpers ───────────────────────────────────────────────────────────
const Y_UP  = new THREE.Vector3(0,1,0);
const dummy = new THREE.Object3D();

function placeSurface(nx, ny, nz, h, outMat, scale=1, yRot=0) {
  const r = getR(h);
  dummy.position.set(nx*r, ny*r, nz*r);
  dummy.quaternion.setFromUnitVectors(Y_UP, new THREE.Vector3(nx,ny,nz));
  if (yRot) dummy.rotateOnWorldAxis(new THREE.Vector3(nx,ny,nz), yRot);
  dummy.scale.setScalar(scale); dummy.updateMatrix();
  outMat.copy(dummy.matrix);
}
function randSphereDir() {
  const phi=Math.acos(rr(-1,1)), th=rr(0,Math.PI*2);
  return [Math.sin(phi)*Math.cos(th), Math.cos(phi), Math.sin(phi)*Math.sin(th)];
}
function randSphereDirG() {
  const phi=Math.acos(grr(-1,1)), th=grr(0,Math.PI*2);
  return new THREE.Vector3(Math.sin(phi)*Math.cos(th), Math.cos(phi), Math.sin(phi)*Math.sin(th));
}

// ── Trees ─────────────────────────────────────────────────────────────────────
const TREE_MAX = isMobile ? 120 : 280;
const trunkGeo = new THREE.CylinderGeometry(0.06,0.10,0.55,5); trunkGeo.translate(0,0.275,0);
const trunkMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(P.treeTrunk) });
const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, TREE_MAX); trunkInst.castShadow=true; scene.add(trunkInst);
const coneA=new THREE.ConeGeometry(0.40,0.70,6); coneA.translate(0,0.62,0);
const coneB=new THREE.ConeGeometry(0.32,0.60,6); coneB.translate(0,0.96,0);
const coneC=new THREE.ConeGeometry(0.22,0.50,6); coneC.translate(0,1.26,0);
const leafMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(P.treeLeaf) });
const [leafA,leafB,leafC] = [coneA,coneB,coneC].map(g=>{const m=new THREE.InstancedMesh(g,leafMat,TREE_MAX);m.castShadow=true;scene.add(m);return m;});
const tMat = new THREE.Matrix4(); let nTrees = 0;
for (let att=0; att<TREE_MAX*12 && nTrees<TREE_MAX; att++) {
  const [nx,ny,nz]=randSphereDir(), h=getH(nx,ny,nz);
  if (h<SEA_H+0.02||h>SEA_H+0.25) continue;
  placeSurface(nx,ny,nz,h,tMat,rr(0.65,1.35),rr(0,Math.PI*2));
  [trunkInst,leafA,leafB,leafC].forEach(m=>m.setMatrixAt(nTrees,tMat)); nTrees++;
}
trunkInst.count=leafA.count=leafB.count=leafC.count=nTrees;
[trunkInst,leafA,leafB,leafC].forEach(m=>m.instanceMatrix.needsUpdate=true);

// ── Rocks ─────────────────────────────────────────────────────────────────────
const ROCK_MAX = isMobile ? 40 : 100;
const rockInst = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.28,0), new THREE.MeshLambertMaterial({color:new THREE.Color(P.rock)}), ROCK_MAX);
rockInst.castShadow=true; scene.add(rockInst);
const rMat = new THREE.Matrix4(); let nRocks=0;
for (let att=0; att<ROCK_MAX*10 && nRocks<ROCK_MAX; att++) {
  const [nx,ny,nz]=randSphereDir(), h=getH(nx,ny,nz);
  if (h<SEA_H+0.20||h>SEA_H+0.48) continue;
  dummy.position.set(nx*getR(h),ny*getR(h),nz*getR(h));
  dummy.quaternion.setFromUnitVectors(Y_UP,new THREE.Vector3(nx,ny,nz));
  dummy.scale.set(grr(0.5,1.3),grr(0.3,0.8),grr(0.5,1.3)); dummy.updateMatrix();
  rockInst.setMatrixAt(nRocks++,dummy.matrix);
}
rockInst.count=nRocks; rockInst.instanceMatrix.needsUpdate=true;

// Snow caps
const SNOW_MAX = isMobile ? 15 : 35;
const snowInst = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.18,0), new THREE.MeshLambertMaterial({color:hex('snow')}), SNOW_MAX);
scene.add(snowInst);
const sMat = new THREE.Matrix4(); let nSnow=0;
for (let att=0; att<SNOW_MAX*15 && nSnow<SNOW_MAX; att++) {
  const [nx,ny,nz]=randSphereDir(), h=getH(nx,ny,nz);
  if (h<SEA_H+0.38) continue;
  placeSurface(nx,ny,nz,h,sMat,rr(0.5,1.2),rr(0,Math.PI*2));
  snowInst.setMatrixAt(nSnow++,sMat);
}
snowInst.count=nSnow; snowInst.instanceMatrix.needsUpdate=true;

// ── Clouds ────────────────────────────────────────────────────────────────────
function makeCloudTex(dark=false) {
  const sz=128; const cv=document.createElement('canvas'); cv.width=cv.height=sz;
  const ctx=cv.getContext('2d');
  [[0.50,0.50,0.35,0.22],[0.28,0.52,0.22,0.17],[0.72,0.48,0.20,0.16],[0.50,0.35,0.18,0.13]]
    .forEach(([cx,cy,rx,ry])=>{
      const gx=cx*sz,gy=cy*sz;
      const col = dark ? 'rgba(40,55,70,' : 'rgba(235,240,245,';
      const g=ctx.createRadialGradient(gx,gy,0,gx,gy,rx*sz);
      g.addColorStop(0, col+'0.9)'); g.addColorStop(0.45, col+'0.5)'); g.addColorStop(1, col+'0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(gx,gy,rx*sz,ry*sz,0,0,Math.PI*2); ctx.fill();
    });
  return new THREE.CanvasTexture(cv);
}
const cloudTex = makeCloudTex();
const CLOUD_MAX = isMobile ? 6 : 14;
for (let i=0; i<CLOUD_MAX; i++) {
  const [nx,ny,nz]=randSphereDir(), h=getH(nx,ny,nz);
  if (h<SEA_H) continue;
  const r=getR(h)+rr(0.5,1.3);
  const cloud=new THREE.Sprite(new THREE.SpriteMaterial({map:cloudTex,transparent:true,opacity:rr(0.28,0.50),depthWrite:false}));
  cloud.position.set(nx*r,ny*r,nz*r); cloud.scale.set(rr(1.4,3.2),rr(0.6,1.2),1); scene.add(cloud);
}

// ════════════════════════════════════════════════════════════════════════════
// VILLAGER SYSTEM
// ════════════════════════════════════════════════════════════════════════════

const SKIN_TONES = ['#f5cba7','#e59866','#ca6f1e','#c68642','#d5a6bd','#ffd5b4'];
const HAIR_COLS  = ['#1a0a00','#5c3317','#f4c430','#e84393','#4a4a8a','#2d4a1e','#aa3300'];
const SHIRT_COLS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#16a085','#e67e22','#27ae60','#c0392b'];
const PANTS_COLS = ['#2c3e50','#7f8c8d','#6d4c41','#1565c0','#2e7d32','#4a148c','#37474f'];

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

function makeVillagerTex(skin, hair, shirt, pants, hairStyle, mood) {
  const W=48, H=72;
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  const ctx=cv.getContext('2d');
  const HX=24, HY=20, HR=12; // head center / radius

  // ── Hair (back layer) ──
  ctx.fillStyle = hair;
  switch (hairStyle) {
    case 0: // short crop
      ctx.beginPath(); ctx.arc(HX,HY,HR+1,Math.PI,0); ctx.fill();
      ctx.fillRect(HX-HR-1,HY-2,HR*2+2,7);
      break;
    case 1: // long flowing
      ctx.beginPath(); ctx.arc(HX,HY,HR+1,Math.PI,0); ctx.fill();
      ctx.fillRect(HX-HR-2,HY,7,16); ctx.fillRect(HX+HR-5,HY,7,16);
      ctx.fillRect(HX-HR-1,HY,HR*2+2,6);
      break;
    case 2: // spiky
      ctx.beginPath(); ctx.arc(HX,HY,HR+1,Math.PI,0); ctx.fill();
      for (let s=0;s<4;s++) {
        const sx=HX-9+s*6;
        ctx.beginPath(); ctx.moveTo(sx-3,HY-HR); ctx.lineTo(sx,HY-HR-9); ctx.lineTo(sx+3,HY-HR); ctx.fill();
      }
      break;
    case 3: // bun
      ctx.beginPath(); ctx.arc(HX,HY,HR+1,Math.PI,0); ctx.fill();
      ctx.fillRect(HX-HR-1,HY-2,HR*2+2,7);
      ctx.beginPath(); ctx.arc(HX,HY-HR-3,6,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.fillRect(HX-3,HY-HR,6,3); ctx.fillStyle=hair;
      break;
    case 4: // afro/curly
      for (let a=0;a<7;a++) {
        const ang=(a/7)*Math.PI*2;
        ctx.beginPath(); ctx.arc(HX+Math.cos(ang)*(HR-2),HY+Math.sin(ang)*(HR-2)-2,8,0,Math.PI*2); ctx.fill();
      }
      ctx.beginPath(); ctx.arc(HX,HY,HR-1,0,Math.PI*2); ctx.fill();
      break;
  }

  // ── Head ──
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(HX,HY,HR,0,Math.PI*2); ctx.fill();

  // ── Eyes ──
  if (mood==='sleep') {
    ctx.strokeStyle='#444'; ctx.lineWidth=1.5; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(HX-6,HY-1); ctx.lineTo(HX-2,HY-1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(HX+2,HY-1); ctx.lineTo(HX+6,HY-1); ctx.stroke();
    ctx.fillStyle='rgba(170,185,255,0.85)'; ctx.font='bold 7px sans-serif'; ctx.fillText('z',HX+HR+1,HY-5);
    ctx.font='bold 5px sans-serif'; ctx.fillText('z',HX+HR+5,HY-10);
  } else if (mood==='panic') {
    ctx.fillStyle='#222';
    ctx.beginPath(); ctx.arc(HX-5,HY-1,4,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(HX+5,HY-1,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(HX-5,HY-1,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(HX+5,HY-1,2,0,Math.PI*2); ctx.fill();
    // Sweat
    ctx.fillStyle='#88aaff';
    ctx.beginPath(); ctx.arc(HX+HR-1,HY-4,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(HX+HR-1,HY-2); ctx.lineTo(HX+HR-1,HY+1); ctx.stroke();
  } else if (mood==='celebrate') {
    ctx.strokeStyle='#222'; ctx.lineWidth=2; ctx.lineCap='round';
    ctx.beginPath(); ctx.arc(HX-5,HY+1,4.5,Math.PI,0); ctx.stroke();
    ctx.beginPath(); ctx.arc(HX+5,HY+1,4.5,Math.PI,0); ctx.stroke();
    // Stars floating
    ctx.fillStyle='#FFD700'; ctx.font='bold 8px sans-serif';
    ctx.fillText('★',HX-HR-8,HY-7); ctx.fillText('★',HX+HR+1,HY-7);
  } else {
    ctx.fillStyle='#222';
    ctx.beginPath(); ctx.arc(HX-5,HY-1,2.8,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(HX+5,HY-1,2.8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(HX-4,HY-2,1,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(HX+6,HY-2,1,0,Math.PI*2); ctx.fill();
  }

  // ── Mouth ──
  ctx.strokeStyle='#773322'; ctx.lineWidth=1.5; ctx.lineCap='round';
  if (mood==='happy'||mood==='busy') {
    ctx.beginPath(); ctx.arc(HX,HY+5,4,0.3,Math.PI-0.3); ctx.stroke();
  } else if (mood==='panic') {
    ctx.beginPath(); ctx.arc(HX,HY+6,3.5,Math.PI,0); ctx.stroke();
  } else if (mood==='sleep') {
    ctx.beginPath(); ctx.moveTo(HX-3,HY+6); ctx.lineTo(HX+3,HY+6); ctx.stroke();
  } else if (mood==='celebrate') {
    ctx.beginPath(); ctx.arc(HX,HY+4,5,0.1,Math.PI-0.1); ctx.stroke();
    // Tongue
    ctx.fillStyle='#ff6677';
    ctx.beginPath(); ctx.arc(HX,HY+7,2,0,Math.PI); ctx.fill();
  }

  // ── Cheeks ──
  if (mood!=='panic') {
    ctx.fillStyle='rgba(255,150,120,0.25)';
    ctx.beginPath(); ctx.ellipse(HX-9,HY+3,5,3,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(HX+9,HY+3,5,3,0,0,Math.PI*2); ctx.fill();
  }

  // ── Neck ──
  ctx.fillStyle=skin; ctx.fillRect(HX-4,HY+HR-1,8,5);

  // ── Body / shirt ──
  ctx.fillStyle=shirt;
  rrect(ctx,HX-11,HY+HR+3,22,18,3); ctx.fill();

  // Shirt collar
  ctx.fillStyle='rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.moveTo(HX-4,HY+HR+3); ctx.lineTo(HX,HY+HR+9); ctx.lineTo(HX+4,HY+HR+3); ctx.fill();

  // ── Arms ──
  const armY = HY+HR+7;
  ctx.strokeStyle=shirt; ctx.lineWidth=5; ctx.lineCap='round';
  if (mood==='celebrate') {
    ctx.beginPath(); ctx.moveTo(HX-10,armY); ctx.lineTo(HX-18,armY-8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(HX+10,armY); ctx.lineTo(HX+18,armY-8); ctx.stroke();
    ctx.strokeStyle=skin; ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(HX-18,armY-8); ctx.lineTo(HX-22,armY-12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(HX+18,armY-8); ctx.lineTo(HX+22,armY-12); ctx.stroke();
  } else if (mood==='panic') {
    ctx.beginPath(); ctx.moveTo(HX-10,armY); ctx.lineTo(HX-20,armY-2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(HX+10,armY); ctx.lineTo(HX+20,armY-4); ctx.stroke();
    ctx.strokeStyle=skin; ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(HX-20,armY-2); ctx.lineTo(HX-24,armY+4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(HX+20,armY-4); ctx.lineTo(HX+24,armY+2); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(HX-10,armY); ctx.lineTo(HX-16,armY+12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(HX+10,armY); ctx.lineTo(HX+16,armY+12); ctx.stroke();
    ctx.strokeStyle=skin; ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(HX-16,armY+12); ctx.lineTo(HX-16,armY+17); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(HX+16,armY+12); ctx.lineTo(HX+16,armY+17); ctx.stroke();
  }

  // ── Pants ──
  ctx.fillStyle=pants;
  ctx.fillRect(HX-11,HY+HR+20,10,15);
  ctx.fillRect(HX+1, HY+HR+20,10,15);
  // Belt
  ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(HX-11,HY+HR+19,22,3);

  // ── Shoes ──
  ctx.fillStyle='#111';
  ctx.beginPath(); ctx.ellipse(HX-6,HY+HR+35,6,3,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(HX+6,HY+HR+35,6,3,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.15)';
  ctx.beginPath(); ctx.ellipse(HX-8,HY+HR+33,3,1.5,Math.PI/4,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(HX+4,HY+HR+33,3,1.5,Math.PI/4,0,Math.PI*2); ctx.fill();

  return new THREE.CanvasTexture(cv);
}

// ── Villager class ────────────────────────────────────────────────────────────
const villagers = [];

class Villager {
  constructor() {
    this.skin      = gpick(SKIN_TONES);
    this.hair      = gpick(HAIR_COLS);
    this.shirt     = gpick(SHIRT_COLS);
    this.pants     = gpick(PANTS_COLS);
    this.hairStyle = gri(0,4);
    this._mood     = 'happy';
    this._texCache = {};

    this.dir         = this._findLandDir();
    this.targetDir   = this.dir.clone();
    this.moveSpeed   = grr(0.0012, 0.0025); // slow leisurely walk
    this.bouncePhase = grr(0, Math.PI*2);
    this._isMoving   = false; // currently walking vs. standing still

    // State: 'idle' (standing), 'wander' (walking), 'sleep', 'panic', 'celebrate'
    this.state      = 'idle';
    this.stateTimer = 0;
    this.nextChange = grr(5, 14); // first idle pause before first walk

    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this._getTex('happy'), transparent:true, depthWrite:false,
    }));
    this.sprite.scale.set(0.9, 1.2, 1);
    this._syncPos(0);
    scene.add(this.sprite);
    villagers.push(this);
  }

  _getTex(mood) {
    if (!this._texCache[mood])
      this._texCache[mood] = makeVillagerTex(this.skin,this.hair,this.shirt,this.pants,this.hairStyle,mood);
    return this._texCache[mood];
  }

  _findLandDir() {
    for (let i=0; i<50; i++) {
      const v=randSphereDirG();
      const h=getH(v.x,v.y,v.z);
      if (h>=SEA_H+0.01 && h<=SEA_H+0.25) return v;
    }
    return randSphereDirG().normalize();
  }

  // Pick a nearby target (within ~40° of current position) so villagers stay local
  _pickNearbyTarget() {
    const perpA = new THREE.Vector3(this.dir.z, 0, -this.dir.x).normalize();
    const perpB = this.dir.clone().cross(perpA).normalize();
    for (let i=0; i<30; i++) {
      const ang   = grr(0, Math.PI*2);
      const dist  = grr(0.15, 0.65); // radians (~9°–37°), short stroll
      const trial = this.dir.clone()
        .addScaledVector(perpA, Math.cos(ang)*dist)
        .addScaledVector(perpB, Math.sin(ang)*dist)
        .normalize();
      const h = getH(trial.x, trial.y, trial.z);
      if (h >= SEA_H+0.005 && h <= SEA_H+0.28) { this.targetDir.copy(trial); return; }
    }
    // Fallback: anywhere on land
    this.targetDir.copy(this._findLandDir());
  }

  setMood(mood) {
    if (this._mood===mood) return;
    this._mood = mood;
    this.sprite.material.map = this._getTex(mood);
    this.sprite.material.needsUpdate = true;
  }

  _syncPos(time) {
    const h = getH(this.dir.x,this.dir.y,this.dir.z);
    let bounce = 0;
    if (this.state==='celebrate') {
      bounce = Math.abs(Math.sin(time*6+this.bouncePhase)) * 0.38;
    } else if (this.state==='panic') {
      bounce = Math.abs(Math.sin(time*14+this.bouncePhase)) * 0.16;
    } else if (this._isMoving) {
      // Gentle walk bob — step rhythm
      bounce = Math.abs(Math.sin(time*3.5+this.bouncePhase)) * 0.07;
    } else if (this.state==='idle') {
      // Very subtle breathing idle sway
      bounce = Math.sin(time*1.2+this.bouncePhase) * 0.018 + 0.018;
    }
    const r = getR(Math.max(h, SEA_H)) + 0.55 + bounce;
    this.sprite.position.copy(this.dir).multiplyScalar(r);
  }

  update(dt, time) {
    this.stateTimer += dt;

    switch (this.state) {
      case 'idle':
        this._isMoving = false;
        if (this.stateTimer > this.nextChange) {
          this.stateTimer = 0;
          const roll = gr();
          if (roll < 0.22) {
            // Fall asleep
            this.state='sleep'; this.setMood('sleep'); this.nextChange=grr(6,16);
          } else {
            // Start walking somewhere nearby
            this.state='wander'; this.setMood('busy');
            this._pickNearbyTarget(); this.nextChange=grr(7,18);
          }
        }
        break;

      case 'wander':
        if (this.stateTimer > this.nextChange) {
          // Stop and stand for a while
          this.state='idle'; this.setMood('happy');
          this.stateTimer=0; this.nextChange=grr(5,15);
        }
        break;

      case 'sleep':
        if (this.stateTimer > this.nextChange) {
          this.state='idle'; this.setMood('happy');
          this.stateTimer=0; this.nextChange=grr(5,12);
        }
        break;

      case 'panic':
        if (this.stateTimer > grr(4,8)) {
          this.state='idle'; this.setMood('happy');
          this.stateTimer=0; this.nextChange=grr(4,10);
        }
        break;

      case 'celebrate':
        if (this.stateTimer > 4) {
          this.state='idle'; this.setMood('happy');
          this.stateTimer=0; this.nextChange=grr(5,12);
        }
        break;
    }

    // Movement — only in wander/panic states
    const speed = this.state==='panic' ? this.moveSpeed*4 : this.state==='wander' ? this.moveSpeed : 0;
    if (speed > 0) {
      const alpha = Math.min(speed * 60 * dt, 0.08);
      this.dir.lerp(this.targetDir, alpha).normalize();
      const distLeft = this.dir.distanceTo(this.targetDir);
      this._isMoving = distLeft > 0.03;
      if (distLeft < 0.015) {
        // Arrived — shift to idle pause
        if (this.state === 'wander') {
          this.state='idle'; this.setMood('happy');
          this.stateTimer=0; this.nextChange=grr(5,14);
        } else {
          this._pickNearbyTarget();
        }
      }
    } else {
      this._isMoving = false;
    }

    this._syncPos(time);
  }

  panic() {
    this.state='panic'; this.setMood('panic'); this.stateTimer=0; this._isMoving=true;
    // Run to a random direction
    this.targetDir.copy(this._findLandDir());
  }

  celebrate() { this.state='celebrate'; this.setMood('celebrate'); this.stateTimer=0; }
}

// Spawn initial villagers
const N_VILLAGERS = isMobile ? 6 : 10;
for (let i=0; i<N_VILLAGERS; i++) new Villager();

// ── House system ──────────────────────────────────────────────────────────────
const houses = [];
const MAX_HOUSES = 25;

const HOUSE_WALL_COLS = [
  new THREE.Color(P.houseWall), new THREE.Color('#c8b89a'),
  new THREE.Color('#d4e8d0'),   new THREE.Color('#e8d4c0'),
];
const HOUSE_ROOF_COLS = [
  new THREE.Color(P.houseRoof), new THREE.Color('#556644'),
  new THREE.Color('#334488'),   new THREE.Color('#884433'),
];

function spawnHouse(dir) {
  if (houses.length >= MAX_HOUSES) return null;
  const nd = dir.clone().normalize();
  const h = getH(nd.x,nd.y,nd.z);
  if (h < SEA_H+0.01 || h > SEA_H+0.20) return null;

  const wi = gri(0,3);
  const g = new THREE.Group();

  // Ground floor body
  const bodyGeo = new THREE.BoxGeometry(0.75,0.50,0.65); bodyGeo.translate(0,0.25,0);
  g.add(Object.assign(new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({color:HOUSE_WALL_COLS[wi]})), {castShadow:true,receiveShadow:true}));

  // 2nd floor
  const floor2Geo = new THREE.BoxGeometry(0.68,0.42,0.58); floor2Geo.translate(0,0.71,0);
  g.add(Object.assign(new THREE.Mesh(floor2Geo, new THREE.MeshLambertMaterial({color:HOUSE_WALL_COLS[wi].clone().multiplyScalar(0.93)})), {castShadow:true}));

  // Windows 2x2
  const winGeo = new THREE.BoxGeometry(0.16,0.18,0.04);
  const winMat = new THREE.MeshLambertMaterial({ color:0xffffcc, emissive:new THREE.Color('#554400'), emissiveIntensity:0.5 });
  [[-0.19,0.28],[0.19,0.28],[-0.19,0.65],[0.19,0.65]].forEach(([wx,wy])=>{
    const w=new THREE.Mesh(winGeo,winMat); w.position.set(wx,wy,0.33); g.add(w);
  });

  // Door (positioned at front face z≈0.33)
  const doorGeo = new THREE.BoxGeometry(0.20,0.30,0.05);
  const door = new THREE.Mesh(doorGeo, new THREE.MeshLambertMaterial({color:new THREE.Color('#3a2208')}));
  door.position.set(0, 0.15, 0.33); g.add(door);
  const doorHandle = new THREE.Mesh(new THREE.SphereGeometry(0.025,6,4), new THREE.MeshLambertMaterial({color:0xddaa44}));
  doorHandle.position.set(0.07,0.14,0.36); g.add(doorHandle);

  // Roof (pyramid 4-sided)
  const roofGeo = new THREE.ConeGeometry(0.52,0.52,4); roofGeo.rotateY(Math.PI/4); roofGeo.translate(0,1.17,0);
  g.add(Object.assign(new THREE.Mesh(roofGeo, new THREE.MeshLambertMaterial({color:HOUSE_ROOF_COLS[wi]})), {castShadow:true}));

  // Chimney
  const chiGeo = new THREE.CylinderGeometry(0.055,0.07,0.30,5); chiGeo.translate(0,1.22,0.12);
  g.add(new THREE.Mesh(chiGeo, new THREE.MeshLambertMaterial({color:new THREE.Color('#554433')})));

  // Fence posts around house
  if (gr()<0.5) {
    const postGeo = new THREE.CylinderGeometry(0.025,0.025,0.18,4); postGeo.translate(0,0.09,0);
    const postMat = new THREE.MeshLambertMaterial({color:new THREE.Color('#9a7a55')});
    [[-0.48,-0.40],[0.48,-0.40],[-0.48,0.40],[0.48,0.40]].forEach(([fx,fz])=>{
      const post=new THREE.Mesh(postGeo,postMat); post.position.set(fx,0,fz); g.add(post);
    });
  }

  // Orient to surface
  g.quaternion.setFromUnitVectors(Y_UP, nd);
  g.position.copy(nd).multiplyScalar(getR(h));
  g.scale.setScalar(0.01);
  scene.add(g);

  const data = { group:g, scale:0.01, target:1.0, dir:nd, h };
  houses.push(data);
  return data;
}

// Initial houses
for (let i=0; i<(isMobile?4:8); i++) spawnHouse(randSphereDirG());

// ── Rain System ───────────────────────────────────────────────────────────────
const rainEvents = [];
const stormCloudTex = makeCloudTex(true);

class RainEvent {
  constructor(pos) {
    this.center = pos.clone().normalize();
    this.timer  = 0;
    this.duration = grr(10, 18);
    this.drops    = [];
    this.nextDrop = 0;
    this.spawnRate = 0.10;

    // Storm cloud mesh
    const r = getR(getH(this.center.x,this.center.y,this.center.z));
    this.cloud = new THREE.Sprite(new THREE.SpriteMaterial({
      map: stormCloudTex, transparent:true, opacity:0.92, depthWrite:false,
    }));
    this.cloud.position.copy(this.center).multiplyScalar(r + 2.2);
    this.cloud.scale.set(4.5, 1.8, 1);
    scene.add(this.cloud);

    // Local rain light
    this.rainLight = new THREE.PointLight(0x334466, 1.2, 8);
    this.rainLight.position.copy(this.cloud.position);
    scene.add(this.rainLight);

    rainEvents.push(this);
    villagers.forEach(v=>{ if(v.dir.distanceTo(this.center)<0.7) v.panic(); });
  }

  update(dt) {
    this.timer += dt;
    this.nextDrop -= dt;

    const alive = this.timer < this.duration;

    if (alive && this.nextDrop <= 0) {
      this.nextDrop = this.spawnRate;
      const perpA = new THREE.Vector3(this.center.z,0,-this.center.x).normalize();
      const perpB = this.center.clone().cross(perpA).normalize();
      const ang = grr(0,Math.PI*2), offs = grr(0,1.0);

      const dropStart = this.cloud.position.clone()
        .addScaledVector(perpA, Math.cos(ang)*offs)
        .addScaledVector(perpB, Math.sin(ang)*offs);

      const drop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015,0.015,0.25,4),
        new THREE.MeshBasicMaterial({color:0x6699cc,transparent:true,opacity:0.65})
      );
      drop.position.copy(dropStart);
      drop._vel = this.center.clone().negate().multiplyScalar(grr(5,9));
      drop._vel.addScaledVector(perpA, grr(-0.5,0.5));
      drop._life = 0; drop._max = grr(0.8,1.8);
      scene.add(drop);
      this.drops.push(drop);
    }

    // Update drops
    const surR = getR(getH(this.center.x,this.center.y,this.center.z));
    for (let i=this.drops.length-1; i>=0; i--) {
      const d = this.drops[i];
      d._life += dt;
      if (d._life>d._max || d.position.length()<surR*0.97) {
        scene.remove(d); d.material.dispose(); d.geometry.dispose();
        this.drops.splice(i,1);
      } else {
        d.position.addScaledVector(d._vel,dt);
        d._vel.addScaledVector(d.position.clone().normalize().negate(), 3*dt);
        // Tilt raindrop along velocity
        const vn = d._vel.clone().normalize();
        d.quaternion.setFromUnitVectors(Y_UP, vn);
      }
    }

    // Fade out near end
    const fadeStart = this.duration * 0.7;
    if (this.timer > fadeStart) {
      const t = (this.timer-fadeStart)/(this.duration-fadeStart);
      this.cloud.material.opacity = 0.92*(1-t);
      this.rainLight.intensity = 1.2*(1-t);
    }

    return alive;
  }

  dispose() {
    scene.remove(this.cloud, this.rainLight);
    this.drops.forEach(d=>{ scene.remove(d); d.material.dispose(); d.geometry.dispose(); });
    this.drops.length = 0;
  }
}

// ── Volcano System ────────────────────────────────────────────────────────────
const volcanoes = [];

class Volcano {
  constructor(pos) {
    this.dir   = pos.clone().normalize();
    const h    = getH(this.dir.x,this.dir.y,this.dir.z);
    const r    = getR(h);
    this.top   = this.dir.clone().multiplyScalar(r + 1.9);
    this.scale = 0.01;
    this.parts = [];
    this.spawnT = 0;

    // Volcano cone
    const coneGeo = new THREE.ConeGeometry(0.9,2.0,8); coneGeo.translate(0,1.0,0);
    this.cone = new THREE.Mesh(coneGeo, new THREE.MeshLambertMaterial({color:0x3a2810}));
    this.cone.quaternion.setFromUnitVectors(Y_UP, this.dir);
    this.cone.position.copy(this.dir).multiplyScalar(r);
    this.cone.castShadow = true;
    scene.add(this.cone);

    // Crater glow disc
    const craterGeo = new THREE.CircleGeometry(0.28,10);
    this.crater = new THREE.Mesh(craterGeo, new THREE.MeshBasicMaterial({color:0xff4400,transparent:true,opacity:0.85}));
    this.crater.position.copy(this.top);
    this.crater.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), this.dir);
    scene.add(this.crater);

    // Lava glow light
    this.light = new THREE.PointLight(0xff5500, 2.5, 10);
    this.light.position.copy(this.top);
    scene.add(this.light);

    volcanoes.push(this);
    villagers.forEach(v=>{ if(v.dir.distanceTo(this.dir)<0.9) v.panic(); });
  }

  _spawnParticle() {
    const perpA = new THREE.Vector3(this.dir.z,0,-this.dir.x).normalize();
    const perpB = this.dir.clone().cross(perpA).normalize();
    const speed = grr(4,9), ang = grr(0,Math.PI*2), spread = grr(0,0.55);
    const vel = this.dir.clone().multiplyScalar(speed*0.85)
      .addScaledVector(perpA, Math.cos(ang)*spread*speed)
      .addScaledVector(perpB, Math.sin(ang)*spread*speed);
    const size = grr(0.05,0.18);
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(size,4,4),
      new THREE.MeshBasicMaterial({color:new THREE.Color().setHSL(grr(0.02,0.09),1,grr(0.45,0.70)),transparent:true})
    );
    p.position.copy(this.top);
    p._vel = vel;
    p._life = 0; p._max = grr(1.2,3.0);
    p._grav = this.dir.clone().negate().multiplyScalar(grr(4,6));
    scene.add(p);
    this.parts.push(p);
  }

  update(dt, time) {
    // Build animation
    if (this.scale < 1) {
      this.scale = Math.min(1, this.scale + dt*0.7);
      this.cone.scale.setScalar(this.scale);
    }
    // Pulsing lava light
    this.light.intensity = 2.0 + Math.sin(time*5)*1.0;
    // Crater flicker
    this.crater.material.opacity = 0.7 + Math.sin(time*8)*0.2;

    // Spawn particles
    this.spawnT += dt;
    if (this.spawnT > 0.07) { this.spawnT=0; this._spawnParticle(); }

    // Update particles
    for (let i=this.parts.length-1; i>=0; i--) {
      const p=this.parts[i]; p._life+=dt;
      const t=p._life/p._max;
      if (t>=1) {
        scene.remove(p); p.material.dispose(); p.geometry.dispose();
        this.parts.splice(i,1);
      } else {
        p.position.addScaledVector(p._vel,dt);
        p._vel.addScaledVector(p._grav,dt);
        p.material.color.setHSL(0.05*(1-t), 1, 0.6-t*0.5);
        p.material.opacity = 1-t*0.6;
      }
    }
  }

  dispose() {
    scene.remove(this.cone, this.crater, this.light);
    this.parts.forEach(p=>{ scene.remove(p); p.material.dispose(); p.geometry.dispose(); });
    this.parts.length = 0;
  }
}

// ── Lightning ─────────────────────────────────────────────────────────────────
function strikeAt(pos) {
  // Flash
  flashLight.color.set(0xaaccff);
  flashLight.position.copy(pos); flashLight.intensity = 10;

  // Jagged bolt geometry
  const dir = pos.clone().normalize();
  const top  = dir.clone().multiplyScalar(pos.length() + 9);
  const mid1 = pos.clone().lerp(top, 0.35).addScaledVector(
    new THREE.Vector3(grr(-1,1),grr(-1,1),grr(-1,1)).normalize(), grr(1,2.5));
  const mid2 = pos.clone().lerp(top, 0.65).addScaledVector(
    new THREE.Vector3(grr(-1,1),grr(-1,1),grr(-1,1)).normalize(), grr(0.5,2));
  const pts = [top,mid1,mid2,pos];
  const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
  const lineMat = new THREE.LineBasicMaterial({color:0xddeeff});
  const bolt = new THREE.Line(lineGeo,lineMat);
  scene.add(bolt);

  // Branch bolt
  const branchEnd = mid1.clone().add(new THREE.Vector3(grr(-2,2),grr(-2,2),grr(-2,2)));
  const brGeo = new THREE.BufferGeometry().setFromPoints([mid1,branchEnd]);
  const br = new THREE.Line(brGeo, new THREE.LineBasicMaterial({color:0xccddff,transparent:true,opacity:0.6}));
  scene.add(br);

  setTimeout(()=>{ scene.remove(bolt,br); lineGeo.dispose(); lineMat.dispose(); brGeo.dispose(); }, 280);

  villagers.forEach(v=>{ if(v.sprite.position.distanceTo(pos)<3.5) v.panic(); });
}

// ── Meteor System ─────────────────────────────────────────────────────────────
const meteors = [];

function spawnMeteor(targetPos) {
  const dir = targetPos.clone().normalize();
  const away = new THREE.Vector3(grr(-1,1),grr(-1,1),grr(-1,1)).normalize();
  const start = dir.clone().multiplyScalar(grr(20,28)).add(away.multiplyScalar(grr(2,5)));
  const vel   = targetPos.clone().sub(start).normalize().multiplyScalar(grr(14,22));
  const size  = grr(0.25,0.5);
  const targetR = getR(getH(dir.x,dir.y,dir.z));

  const geo = new THREE.SphereGeometry(size,7,5);
  const mat = new THREE.MeshBasicMaterial({color:0xff6600,transparent:true,opacity:1});
  const mesh = new THREE.Mesh(geo,mat);
  mesh.position.copy(start);

  // Glow shell
  const gGeo = new THREE.SphereGeometry(size*2.5,7,5);
  const gMat = new THREE.MeshBasicMaterial({color:0xff4400,transparent:true,opacity:0.25,side:THREE.BackSide});
  const glow = new THREE.Mesh(gGeo,gMat); mesh.add(glow);

  scene.add(mesh);
  meteors.push({ mesh, vel, targetR, landed:false, dir });
}

// ── OrbitControls ─────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping   = true;
controls.dampingFactor   = 0.05;
controls.minDistance     = 13;
controls.maxDistance     = 55;
controls.autoRotate      = true;
controls.autoRotateSpeed = 0.3;
controls.enablePan       = false;

// ── God interaction ───────────────────────────────────────────────────────────
let godMode = 'poke';
let isDragging = false;
let pointerStart = {x:0,y:0};
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

document.querySelectorAll('.god-btn').forEach(btn=>{
  btn.addEventListener('click', e=>{
    e.stopPropagation();
    document.querySelectorAll('.god-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    godMode = btn.dataset.mode;
  });
});

renderer.domElement.addEventListener('pointerdown', e=>{
  isDragging = false; pointerStart={x:e.clientX,y:e.clientY};
  controls.autoRotate = false;
});
renderer.domElement.addEventListener('pointermove', e=>{
  const dx=e.clientX-pointerStart.x, dy=e.clientY-pointerStart.y;
  if (dx*dx+dy*dy > 25) isDragging = true;
});
renderer.domElement.addEventListener('pointerup', e=>{
  controls.autoRotate = true;
  if (isDragging) return;

  mouse.set((e.clientX/innerWidth)*2-1, -(e.clientY/innerHeight)*2+1);
  raycaster.setFromCamera(mouse, camera);

  // Try sprite first (for poke)
  const spriteHits = raycaster.intersectObjects(villagers.map(v=>v.sprite));
  if (godMode==='poke' && spriteHits.length>0) {
    const v = villagers.find(v=>v.sprite===spriteHits[0].object);
    if (v) v.panic();
    return;
  }

  const planetHits = raycaster.intersectObject(planet);
  if (!planetHits.length) return;
  const hitPos = planetHits[0].point;
  const hitDir = hitPos.clone().normalize();

  switch (godMode) {
    case 'poke': {
      let nearest=null, nd=Infinity;
      villagers.forEach(v=>{ const d=v.sprite.position.distanceTo(hitPos); if(d<nd){nd=d;nearest=v;} });
      if (nearest && nd<4) nearest.panic();
      break;
    }
    case 'rain':
      if (rainEvents.length < 3) new RainEvent(hitPos);
      break;
    case 'lightning':
      strikeAt(hitPos);
      break;
    case 'volcano':
      if (volcanoes.length < 3) new Volcano(hitPos);
      else volcanoes[gri(0,volcanoes.length-1)].light.intensity = 8; // re-energise existing
      break;
    case 'bless': {
      let cnt=0;
      villagers.forEach(v=>{ if(v.dir.distanceTo(hitDir)<0.55){v.celebrate();cnt++;} });
      if (cnt>0 || gr()<0.5) spawnHouse(hitDir);
      // Bless glow flash (warm)
      flashLight.color.set(0xffffaa); flashLight.position.copy(hitPos); flashLight.intensity=5;
      break;
    }
    case 'meteor':
      spawnMeteor(hitPos);
      break;
  }
});

// Number keys select god mode
window.addEventListener('keydown', e=>{
  const k = e.key.toLowerCase();
  if (k==='r') { location.reload(); return; }
  if (k==='s') {
    composer.render();
    renderer.domElement.toBlob(blob=>{
      Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:`tiny-planet-${P.name}.png`}).click();
    });
    return;
  }
  const modes=['poke','rain','lightning','volcano','bless','meteor'];
  const n=parseInt(k);
  if (n>=1 && n<=6) {
    godMode=modes[n-1];
    document.querySelectorAll('.god-btn').forEach((b,i)=>b.classList.toggle('active',i===n-1));
  }
});

// ── Post-processing ───────────────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight), 0.25, 0.4, 0.80));
composer.addPass(new OutputPass());

// ── UI ────────────────────────────────────────────────────────────────────────
const loading = document.getElementById('loading');
loading.style.opacity = '0';
setTimeout(()=>loading.remove(), 900);
document.getElementById('meta').textContent =
  `${P.name} · ${nTrees}棵樹 · ${houses.length}棟屋 · ${villagers.length}位村民`;

window.addEventListener('resize', ()=>{
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight); composer.setSize(innerWidth,innerHeight);
});

// ── Animation Loop ────────────────────────────────────────────────────────────
let lastT = performance.now(), elapsed = 0;

(function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt  = Math.min((now-lastT)/1000, 0.05);
  lastT = now; elapsed += dt;

  // Ocean shimmer
  oceanMat.opacity = 0.70 + Math.sin(elapsed*0.7)*0.03;

  // Sun orbit (slow day cycle)
  sun.position.set(28*Math.cos(elapsed*0.01), 18, 28*Math.sin(elapsed*0.01));

  // Flash decay
  if (flashLight.intensity > 0.01) flashLight.intensity *= 0.86;
  else flashLight.intensity = 0;

  // House build animation
  houses.forEach(hd=>{
    if (hd.scale < hd.target) {
      hd.scale = Math.min(hd.target, hd.scale + dt*0.6);
      hd.group.scale.setScalar(hd.scale);
    }
  });

  // Villagers
  villagers.forEach(v=>v.update(dt,elapsed));

  // Rain
  for (let i=rainEvents.length-1; i>=0; i--) {
    if (!rainEvents[i].update(dt)) { rainEvents[i].dispose(); rainEvents.splice(i,1); }
  }

  // Volcanoes
  volcanoes.forEach(v=>v.update(dt,elapsed));

  // Meteors
  for (let i=meteors.length-1; i>=0; i--) {
    const m = meteors[i];
    if (m.landed) { scene.remove(m.mesh); m.mesh.geometry.dispose(); m.mesh.material.dispose(); meteors.splice(i,1); continue; }
    m.mesh.position.addScaledVector(m.vel, dt);
    // Add slight gravity toward center for curve
    m.vel.addScaledVector(m.dir.clone().negate(), 1.5*dt);
    if (m.mesh.position.length() <= m.targetR + 0.8) {
      m.landed = true;
      flashLight.color.set(0xff8833); flashLight.position.copy(m.mesh.position); flashLight.intensity=14;
      villagers.forEach(v=>{ if(v.sprite.position.distanceTo(m.mesh.position)<4.5) v.panic(); });
    }
  }

  controls.update();
  composer.render();
})();
