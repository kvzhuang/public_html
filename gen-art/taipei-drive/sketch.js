import * as T from './vendor/three.module.js';
import {cityLife} from './city-life.js?v=8';
import {footprint,overlaps,obstacleIndex} from './collision.js?v=4';
const obstacles=obstacleIndex();
import {atmosphere} from './atmosphere.js?v=3';
const $=s=>document.getElementById(s),params=new URLSearchParams(location.search),preview=params.has('preview')||self!==top;
if(preview)document.body.classList.add('preview');
let seed=125101;const rand=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const scene=new T.Scene();scene.background=new T.Color('#172c39');scene.fog=new T.FogExp2('#172c39',.0065);
const renderer=new T.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,preview?1:1.6));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
const camera=new T.PerspectiveCamera(57,innerWidth/innerHeight,.2,850);scene.add(new T.HemisphereLight('#a2cee4','#34322b',2.1));const moon=new T.DirectionalLight('#b1d8e1',2.1);moon.position.set(-80,150,60);scene.add(moon);
const mats=new Map(),geo=new T.BoxGeometry(1,1,1);function mat(c,glow=false){const k=c+glow;if(!mats.has(k))mats.set(k,new T.MeshStandardMaterial({color:c,roughness:glow?.35:.75,metalness:.15,emissive:glow?c:'#000000',emissiveIntensity:glow?1.8:0}));return mats.get(k)}
// Static boxes are batched by material after the city is built.
const batches=new Map();function box(x,y,z,w,h,d,c,parent=scene,glow=false){if(parent===scene){if(y+h/2>.3&&y-h/2<3.2)obstacles.add(footprint(x,z,w/2,d/2));const m=mat(c,glow);if(!batches.has(m))batches.set(m,[]);batches.get(m).push([x,y,z,w,h,d]);return}const mesh=new T.Mesh(geo,mat(c,glow));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh}
const neon=['#ef7a62','#7ce8c9','#f4c975','#b9a0ea','#e6d9aa'];
box(0,-.35,0,580,.5,580,'#17282e');
const roads=[-180,-90,0,90,180];
for(const a of roads){box(a,-.04,0,22,.12,430,'#25343a');box(0,-.03,a,430,.12,22,'#25343a');for(let k=-209;k<210;k+=7){if(roads.some(r=>Math.abs(k-r)<14))continue;for(const o of [-.35,.35]){box(a+o,.045,k,.13,.035,3.8,'#c2a265');box(k,.05,a+o,3.8,.035,.13,'#c2a265')}for(const o of [-7.5,7.5]){box(a+o,.045,k,.13,.035,2,'#8a9798');box(k,.05,a+o,2,.035,.13,'#8a9798')}}}
for(const x of roads)for(const z of roads){for(let k=-8;k<=8;k+=2){box(x+k,.065,z-13,1,.035,4,'#b3c0bb');box(x+k,.065,z+13,1,.035,4,'#b3c0bb');box(x-13,.065,z+k,4,.035,1,'#b3c0bb');box(x+13,.065,z+k,4,.035,1,'#b3c0bb')}}
const signCache=new Map();function sign(text,color,w,h,x,y,z,rot=0){const key=text+color;if(!signCache.has(key)){let c=document.createElement('canvas');c.width=128;c.height=512;const ctx=c.getContext('2d');ctx.fillStyle='#14272e';ctx.fillRect(0,0,128,512);ctx.strokeStyle=color;ctx.lineWidth=5;ctx.strokeRect(5,5,118,502);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 78px sans-serif';[...text].forEach((v,i)=>ctx.fillText(v,64,512/(text.length)*(i+.5)));const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;signCache.set(key,new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}))}const m=new T.Mesh(new T.PlaneGeometry(w,h),signCache.get(key));m.position.set(x,y,z);m.rotation.y=rot;scene.add(m)}
const names=['台北夜市','永和豆漿','牛肉麵館','足體養生','台灣茶行','夜來香','小吃熱炒','中山旅社','珍珠奶茶','福星飯店','機車修理','滷肉飯'];
function building(x,z,w,d,h,front){const color=['#43545a','#3a4e55','#55615d','#4b4c53','#34484e'][Math.floor(rand()*5)];box(x,h/2+3,z,w,h,d,color);box(x,h+3.3,z,w+.8,.7,d+.8,'#263e45');box(x,2.9,z,w+.6,.65,d+.6,'#718078');box(x,4.1,z,w+.8,.22,d+.8,'#222e35');for(let xx=-w/2+1;xx<w/2;xx+=4){for(let yy=6;yy<h+1;yy+=3.6){const light=rand()>.42;const c=light?(rand()>.5?'#c5b88a':'#7cabae'):'#243b46';box(x+xx,yy,z+d/2+.03,1.5,1.65,.08,c,scene,light);box(x+xx,yy,z-d/2-.03,1.5,1.65,.08,c,scene,light)}box(x+xx,1.5,z+front*(d/2-.2),.4,3,.4,'#8b9185');box(x+xx,1.35,z,2.8,2.5,d+.05,'#243c43')}
for(let zz=-d/2+2;zz<d/2;zz+=4)for(let yy=6;yy<h+1;yy+=3.6){const c=rand()>.5?'#a5c4b5':'#293d48';box(x-w/2-.03,yy,z+zz,.08,1.7,1.6,c,scene,c!=='#293d48');box(x+w/2+.03,yy,z+zz,.08,1.7,1.6,c,scene,c!=='#293d48')}
box(x,h+4.8,z,3,2.5,3,'#788b8b');const c=neon[Math.floor(rand()*neon.length)];sign(names[Math.floor(rand()*names.length)],c,2.1,9,x+w/2-.5,8,z+front*(d/2+.8),front===1?0:Math.PI);box(x,3.55,z+front*(d/2+.5),w-.7,.35,1.3,c,scene,true);
for(const side of [-1,1]){sign(names[Math.floor(rand()*names.length)],c,2.3,9,x+side*(w/2+.15),8,z+d/2-1,side*Math.PI/2);box(x+side*(w/2+.4),3.55,z,.8,.28,d-.7,c,scene,true)}
// Broken strips of color suggest neon reflected on wet pavement.
for(let i=0;i<5;i++)box(x+(rand()-.5)*w,.08,z+front*(d/2+3+i*.8),rand()*3+.3,.012,.13,c);
}
for(let ix=0;ix<4;ix++)for(let iz=0;iz<4;iz++){const cx=roads[ix]+45,cz=roads[iz]+45;box(cx,.18,cz,67,.4,67,'#485657');for(let j=0;j<4;j++){const x=cx-25+j*16.5;building(x,cz-24,14,17,12+Math.floor(rand()*7)*3.6,-1);building(x,cz+24,14,17,12+Math.floor(rand()*9)*3.6,1)}for(const dx of [-24,24])building(cx+dx,cz,17,27,15+rand()*27,1);}
// A tiered silhouette inspired by Taipei 101, placed beyond the street grid.
const tx=130,tz=-260;box(tx,10,tz,30,20,30,'#315960');for(let i=0;i<8;i++){const y=26+i*11;box(tx,y,tz,22-i*.7,10,22-i*.7,'#396772');box(tx,y+5,tz,24-i*.7,.7,24-i*.7,'#6ca99d',scene,true);for(const dx of [-7,0,7])box(tx+dx,y,tz+11-i*.35,.4,9,.1,'#82b5aa',scene,true)}box(tx,123,tz,9,20,9,'#517d82');box(tx,143,tz,.9,24,.9,'#99c7b6',scene,true);
for(const x of roads)for(let z=-160;z<180;z+=34){if(roads.some(r=>Math.abs(z-r)<19))continue;for(const side of [-1,1]){box(x+side*12.8,4.8,z,.18,9.6,.18,'#6b8685');box(x+side*11,9.4,z,3.8,.15,.3,'#6b8685');box(x+side*9.8,9.25,z,1.7,.12,.65,'#e2d0a1',scene,true);box(x+side*13.3,.5,z+4,.8,1,2,'#183c34');box(x+side*13.3,1.05,z+4,.7,.45,1.1,'#7f8c88')}}
const life=cityLife({scene,box,mat,rand,roads,preview});
const ambience=atmosphere({scene,box,roads,rand,preview});
for(const [material,items]of batches){const mesh=new T.InstancedMesh(geo,material,items.length),dummy=new T.Object3D();items.forEach((a,i)=>{dummy.position.set(...a.slice(0,3));dummy.scale.set(...a.slice(3));dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)});mesh.computeBoundingSphere();scene.add(mesh)}batches.clear();
function car(color,taxi=false,scooter=false){const g=new T.Group();const w=scooter?.65:2.05,l=scooter?1.8:4.2;box(0,.68,0,w,.65,l,color,g);box(0,1.17,-.2,w*.85,.62,l*.48,'#122e3b',g);if(!scooter){box(0,1.5,-.25,w*.9,.15,l*.47,color,g);box(0,.75,2.06,1.3,.2,.06,'#181e22',g);for(const s of [-1,1]){box(s*.72,.82,2.12,.48,.22,.08,'#fff1be',g,true);box(s*.72,.82,-2.12,.5,.18,.08,'#ff5345',g,true)}if(taxi)box(0,1.75,0,.8,.3,.45,'#f9efb0',g,true)}else{box(0,1.65,-.25,.48,.9,.5,'#40535f',g);const head=new T.Mesh(new T.SphereGeometry(.28,8,6),mat('#c0d5cf'));head.position.set(0,2.22,-.25);g.add(head)}for(const s of [-1,1])for(const z of [-l*.32,l*.32]){const wheel=new T.Mesh(new T.CylinderGeometry(.36,.36,.22,10),mat('#111e24'));wheel.rotation.z=Math.PI/2;wheel.position.set(s*w/2,.4,z);g.add(wheel)}if(!scooter){
  for(const side of [-1,1]){box(side*1.13,1.17,.55,.22,.16,.36,color,g);box(side*1.035,.83,-.45,.04,.08,.32,'#bbc8c3',g)}
  box(0,.52,-2.15,.62,.18,.035,'#d9d7bf',g);
}scene.add(g);return g}
// A closed road-aligned route with quadratic corner arcs; no spline cuts across blocks.
const nodes=[[-90,0],[-90,-90],[0,-90],[90,-90],[90,0],[180,0],[180,90],[90,90],[0,90],[0,180],[-90,180],[-90,90],[-180,90],[-180,0]];
const points=nodes.map(([x,z])=>new T.Vector3(x,0,z)),path=new T.CurvePath(),radius=12;
for(let i=0;i<points.length;i++){const a=points[(i+points.length-1)%points.length],b=points[i],c=points[(i+1)%points.length];const incoming=b.clone().add(a.clone().sub(b).normalize().multiplyScalar(radius));const outgoing=b.clone().add(c.clone().sub(b).normalize().multiplyScalar(radius));const next=c.clone().add(b.clone().sub(c).normalize().multiplyScalar(radius));path.add(new T.QuadraticBezierCurve3(incoming,b,outgoing));path.add(new T.LineCurve3(outgoing,next))}
const length=path.getLength();function pose(u,lane=3.5){u=((u%1)+1)%1;const p=path.getPointAt(u),t=path.getTangentAt(u).normalize();p.x-=t.z*lane;p.z+=t.x*lane;return{p,t,angle:Math.atan2(t.x,t.z)}}
const hero=car('#e8b745',true),traffic=Array.from({length:22},(_,i)=>({mesh:car(['#c1cdc5','#566d79','#cf765d','#d7b64f'][i%4],i%4===3,i%3===0),u:(i+1)/23,lane:i%2?3.5:-3.5,dir:i%2?1:-1}));
// Larger vehicles share the lane and signal rules with the taxi.
for(const index of [3,10,17]) {
  const v=traffic[index],bus=index!==10;
  scene.remove(v.mesh);v.mesh=car(bus?'#759e87':'#adb7b2');
  const g=v.mesh;
  box(0,bus?1.7:1.6,-.7,2.15,bus?2.15:1.95,bus?6.4:3.3,bus?'#819f91':'#aab9b3',g);
  if(bus){
    for(const side of [-1,1])for(let j=0;j<5;j++) {
      box(side*1.08,2.15,1.6-j*1.05,.025,.85,.88,'#29444c',g);
      box(side*.91,1.86,1.6-j*1.05,.2,.38,.4,'#b7a17c',g);
    }
    box(0,2.17,2.52,1.8,.8,.025,'#29444c',g);box(0,2.75,2.53,1.5,.24,.03,'#e6b86b',g,true);
    box(0,1,-.7,2.18,.25,6.3,'#caaf71',g);
  }else{box(0,1.7,-2.38,1.9,1.6,.04,'#657779',g);box(0,1.7,-2.42,.06,1.6,.03,'#cad3c7',g)}
  v.clearance=bus?11:8;
}
// Measure solid geometry before adding light sprites; buses have an offset rear.
const taxi={mesh:hero,u:.035,lane:3.5,dir:1};
const vehicles=[taxi,...traffic];
for(const v of vehicles){const bounds=new T.Box3().setFromObject(v.mesh);v.width=(bounds.max.x-bounds.min.x)/2;v.halfLength=(bounds.max.z-bounds.min.z)/2;v.center=(bounds.max.z+bounds.min.z)/2;v.speed=0;v.homeLane=v.lane;v.laneTarget=v.lane;v.cruise=v===taxi?12:v.clearance?7:9.4;v.passes=0}
function bodyAt(v,at=v.u,lane=v.lane){const q=pose(at,lane),angle=q.angle+(v.dir===-1?Math.PI:0);return footprint(q.p.x+Math.sin(angle)*v.center,q.p.z+Math.cos(angle)*v.center,v.width,v.halfLength,angle)}
// Never spawn a vehicle inside scenery or another vehicle.
const placed=[];
for(const v of vehicles){for(let attempt=0;attempt<2000;attempt++){const b=bodyAt(v);if(!obstacles.hits(b)&&!placed.some(o=>overlaps(b,bodyAt(o),2)))break;v.u=(v.u+.001)%1}placed.push(v)}
let overtaking=true;
function junctionDistance(v){const p=pose(v.u).p;return Math.min(...roads.flatMap(x=>roads.map(z=>Math.hypot(p.x-x,p.z-z))))}
function safeLane(v,target,bodies,ignore){
  // Sweep the full lateral corridor and reserve room ahead and behind.
  // `ignore` = the vehicle we intend to overtake; it sits ahead in our own lane,
  // so it must not veto pulling out (the per-step lateral check still prevents contact).
  for(let lane=v.lane;;lane+=Math.sign(target-v.lane)*.3){
    const candidate=Math.abs(lane-v.lane)>=Math.abs(target-v.lane)?target:lane;
    for(let d=-3;d<=10;d+=1){const b=bodyAt(v,v.u+v.dir*d/length,candidate);if(obstacles.hits(b)||vehicles.some(o=>o!==v&&o!==ignore&&overlaps(b,bodies.get(o),.65)))return false}
    if(candidate===target)return true;
  }
}
// 前方同向、同車道內最近的一台車（要超越的對象；null=前方淨空）
function leaderAhead(v,range){
  let best=null,bestD=Infinity;
  for(const o of vehicles){if(o===v||Math.sign(o.dir)!==Math.sign(v.dir)||Math.abs(o.lane-v.lane)>2.2)continue;
    const d=((((o.u-v.u)*v.dir)%1)+1)%1*length;
    if(d>0&&d<range&&d<bestD){bestD=d;best=o}}
  return best;
}
function advanceTraffic(dt,time){
  let moved=0;const bodies=new Map(vehicles.map(v=>[v,bodyAt(v)]));
  for(let remaining=dt;remaining>1e-8;){const step=Math.min(remaining,1/60);remaining-=step;
    for(const v of vehicles){
      const junction=junctionDistance(v),outside=Math.abs(v.laneTarget)>4;
      if(Math.abs(v.lane-v.laneTarget)<.01){
        if(outside&&(!overtaking||junction<32||!v.passUntil||time>v.passUntil)&&safeLane(v,v.homeLane,bodies)){v.laneTarget=v.homeLane}
        else if(!outside&&overtaking&&junction>34){
          const leader=leaderAhead(v,v===taxi?18:10);        // 前方同車道最近的同向車（超越對象）
          const slow=v===taxi&&leader&&leader.speed<v.cruise-1; // 主角：前方較慢→提前主動超車
          // 排除 leader，讓「被超越的車」不會否決變換車道；橫向位移仍由第 99 行逐格防碰撞把關
          if(((v.blocked&&!v.waiting)||slow)&&safeLane(v,v.homeLane*2,bodies,leader)){v.laneTarget=v.homeLane*2;v.passUntil=time+(v===taxi?5:4);v.passes++}
        }
      }
      if(v.lane!==v.laneTarget){const next=v.lane+Math.sign(v.laneTarget-v.lane)*Math.min(Math.abs(v.laneTarget-v.lane),step*2);const b=bodyAt(v,v.u,next);if(!obstacles.hits(b)&&!vehicles.some(o=>o!==v&&overlaps(b,bodies.get(o),.4))){v.lane=next;bodies.set(v,b)}}
      const q=pose(v.u,v.lane),direction=q.t.clone().multiplyScalar(v.dir),curve=q.t.angleTo(pose(v.u+v.dir*.004,v.lane).t);
      const waiting=life.stopAt(q.p,direction,time-remaining,v.halfLength+Math.abs(v.center));
      const target=waiting||(Math.abs(v.lane)>4&&junction<25)?0:curve>.06?5.5:v.cruise;
      const speed=Math.min(target,v.speed+step*3),distance=speed*step;
      let blocked=false;
      // Check the entire proposed movement and a speed-dependent following gap.
      const lookahead=distance+.65+speed*.45;
      for(let d=0;d<=lookahead+.001;d+=.2){const b=bodyAt(v,v.u+v.dir*Math.min(d,lookahead)/length);if(obstacles.hits(b)||vehicles.some(o=>o!==v&&overlaps(b,bodies.get(o),.25))){blocked=true;break}}
      v.speed=blocked?0:speed;v.waiting=waiting;v.blocked=blocked;
      if(!blocked){v.u=(v.u+v.dir*distance/length+1)%1;bodies.set(v,bodyAt(v));if(v===taxi)moved+=distance}
    }
  }
  for(const v of vehicles){const q=pose(v.u,v.lane);v.mesh.position.copy(q.p);v.mesh.rotation.y=q.angle+(v.dir===-1?Math.PI:0)}
  return moved;
}
for(const v of traffic)ambience.vehicleLights(v.mesh);
ambience.vehicleLights(hero);
const headlights=new T.SpotLight('#fff2cc',45,40,.55,.6,1);hero.add(headlights);headlights.position.set(0,1,1.9);hero.add(headlights.target);headlights.target.position.set(0,0,18);
const rainCount=preview?400:1700,rainPos=new Float32Array(rainCount*6);for(let i=0;i<rainCount;i++){const k=i*6;rainPos[k]=(rand()-.5)*160;rainPos[k+1]=rand()*65;rainPos[k+2]=(rand()-.5)*160;rainPos[k+3]=rainPos[k]-.18;rainPos[k+4]=rainPos[k+1]+.85;rainPos[k+5]=rainPos[k+2]}
const rg=new T.BufferGeometry();rg.setAttribute('position',new T.BufferAttribute(rainPos,3));const rain=new T.LineSegments(rg,new T.LineBasicMaterial({color:'#afced7',transparent:true,opacity:.24,depthWrite:false}));scene.add(rain);
let u=.035,elapsed=0,travel=0,paused=false,mult=1,mode=0,yaw=0,zoom=1,english=params.get('lang')==='en',drag=null,visible=true;const ctx=$('map').getContext('2d');
function labels(){document.querySelectorAll('[data-zh]').forEach(e=>e.textContent=e.dataset[english?'en':'zh']);$('camera').textContent=(english?'Camera: ':'視角：')+(english?['Chase','Cockpit','Aerial']:['追車','車內','鳥瞰'])[mode];$('pause').textContent=paused?(english?'▶ Resume':'▶ 繼續'):(english?'Ⅱ Pause':'Ⅱ 暫停');$('pace').textContent=(english?'Speed':'速度')+' ×'+mult;$('overtake').textContent=(english?'Overtake: ':'超車：')+(overtaking?(english?'On':'開'):(english?'Off':'關'));$('overtake').setAttribute('aria-pressed',overtaking);$('rain').textContent=(english?'Rain: ':'雨：')+(rain.visible?(english?'On':'開'):(english?'Off':'關'));document.documentElement.lang=english?'en':'zh-Hant'}labels();
$('overtake').onclick=()=>{overtaking=!overtaking;labels()};$('lang').onclick=()=>{english=!english;labels()};$('camera').onclick=()=>{mode=(mode+1)%3;yaw=0;labels()};$('pause').onclick=()=>{paused=!paused;labels()};$('pace').onclick=()=>{mult=mult===1?1.5:mult===1.5?.65:1;labels()};$('rain').onclick=()=>{rain.visible=!rain.visible;$('rain').setAttribute('aria-pressed',rain.visible);labels()};addEventListener('keydown',e=>{if(e.target.closest('button'))return;if(e.code==='Space'){e.preventDefault();$('pause').click()}if(e.code==='KeyC')$('camera').click()});
$('world').onpointerdown=e=>{drag=e.clientX;$('world').setPointerCapture(e.pointerId)};$('world').onpointermove=e=>{if(drag!==null){yaw-=(e.clientX-drag)*.005;drag=e.clientX}};for(const type of ['pointerup','pointercancel'])$('world').addEventListener(type,()=>drag=null);$('world').addEventListener('wheel',e=>{e.preventDefault();zoom=T.MathUtils.clamp(zoom+e.deltaY*.001,.55,1.7)},{passive:false});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});document.addEventListener('visibilitychange',()=>{visible=!document.hidden});if(preview)new IntersectionObserver(e=>{visible=e[0].isIntersecting}).observe($('world'));
const desired=new T.Vector3(),look=new T.Vector3(),clock=new T.Clock();let started=false,lastUI=0;
function minimap(p){ctx.fillStyle='#0b1a20';ctx.fillRect(0,0,240,240);const cv=v=>120+v*.5;ctx.lineWidth=8;ctx.strokeStyle='#34464b';for(const a of roads){ctx.beginPath();ctx.moveTo(cv(a),12);ctx.lineTo(cv(a),228);ctx.moveTo(12,cv(a));ctx.lineTo(228,cv(a));ctx.stroke()}ctx.strokeStyle='#c5e99c';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<=240;i++){const v=pose(i/240).p;ctx[i?'lineTo':'moveTo'](cv(v.x),cv(v.z))}ctx.stroke();ctx.fillStyle='#8caba4';for(const v of traffic){ctx.fillRect(cv(v.mesh.position.x)-1,cv(v.mesh.position.z)-1,2,2)}ctx.save();ctx.translate(cv(p.p.x),cv(p.p.z));ctx.rotate(-p.angle);ctx.fillStyle='#f6db7f';ctx.shadowColor='#f6db7f';ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(0,7);ctx.lineTo(-5,-5);ctx.lineTo(5,-5);ctx.closePath();ctx.fill();ctx.restore();ctx.fillStyle='#b8c8bd';ctx.font='10px sans-serif';ctx.fillText('N ↑',13,18)}
function frame(){requestAnimationFrame(frame);const raw=Math.min(clock.getDelta(),.05);if(!visible)return;const dt=paused?0:raw*mult;elapsed+=dt;travel+=advanceTraffic(dt,elapsed);u=taxi.u;const p=pose(u,taxi.lane),curve=p.t.angleTo(pose(u+.004).t),waiting=taxi.waiting,blocked=taxi.blocked,speed=taxi.speed;hero.rotation.z=Math.sin(elapsed*2)*.006;hero.visible=mode!==1;
life.update(elapsed,rain.visible);ambience.update(elapsed);
const a=p.angle+yaw;if(mode===0){desired.set(p.p.x-Math.sin(a)*12*zoom,6.3*zoom,p.p.z-Math.cos(a)*12*zoom);look.copy(p.p).addScaledVector(p.t,10);look.y=2.3}else if(mode===1){desired.copy(p.p);desired.y=1.65;look.set(p.p.x+Math.sin(a)*20,1.8,p.p.z+Math.cos(a)*20)}else{desired.set(p.p.x-38*zoom,65*zoom,p.p.z+40*zoom);look.copy(p.p)}camera.position.lerp(desired,started?1-Math.exp(-raw*(mode===1?18:5)):1);camera.lookAt(look);started=true;
rain.position.set(p.p.x,0,p.p.z);if(rain.visible&&dt){for(let i=0;i<rainCount;i++){const k=i*6;rainPos[k+1]-=dt*24;if(rainPos[k+1]<0)rainPos[k+1]=65;rainPos[k+4]=rainPos[k+1]+.85}rg.attributes.position.needsUpdate=true}renderer.render(scene,camera);
if(clock.elapsedTime-lastUI>.12){lastUI=clock.elapsedTime;minimap(p);$('speed').textContent=paused?'0':Math.round(speed*3.6*mult);$('distance').textContent=(travel/1000).toFixed(2)+' KM';const road=Math.abs(p.t.z)>.7?(p.p.x<-120?0:p.p.x<0?1:2):(p.p.z<0?3:4);$('district').textContent=(english?['Dihua Street','Zhongshan N. Rd.','Dunhua S. Rd.','Nanjing E. Rd.','Xinyi Road']:['迪化街','中山北路','敦化南路','南京東路','信義路'])[road];const sig=life.signal(Math.abs(p.t.z)>.7?0:1,elapsed);$('signal').textContent=(english?{green:'Green',amber:'Amber',red:'Red'}:{green:'綠燈',amber:'黃燈',red:'紅燈'})[sig.color]+' · '+sig.remaining+'s';$('signal').dataset.color=sig.color;$('action').textContent=paused?(english?'Cruise paused':'已暫停巡航'):waiting?(english?'Waiting for green':'路口停等紅燈'):blocked?(english?'Following traffic':'跟隨前方車流'):Math.abs(taxi.lane)>4?(english?'Overtaking / merging':'超車／返回車道中'):curve>.06?(english?'Turning at junction':'路口減速轉彎'):(english?'Cruising the city':'自動巡航中')}}
frame();$('status').hidden=true;
// Expose read-only diagnostics for smoke checks without coupling controls to tests.
window.taipeiDrive={get state(){return{u,paused,mode,mult,distance:travel,pedestrians:life.count,simulationTime:elapsed,overtaking,signals:[life.signal(0,elapsed),life.signal(1,elapsed)],raining:rain.visible,collisions:vehicles.reduce((n,v,i)=>n+vehicles.slice(i+1).filter(o=>overlaps(bodyAt(v),bodyAt(o))).length,0),obstacleCollisions:vehicles.filter(v=>obstacles.hits(bodyAt(v))).length,vehicles:vehicles.map(v=>({u:v.u,speed:v.speed,lane:v.lane,passes:v.passes,waiting:v.waiting})),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles}}};
