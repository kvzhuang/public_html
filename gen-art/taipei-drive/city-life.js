import * as T from './vendor/three.module.js';

// Street furniture shares the city's static instance batches; animated people use
// one instanced mesh so a busy pavement does not mean hundreds of draw calls.
export function cityLife({scene,box,mat,rand,roads,preview}) {
  const signs=new Map(),signals=[],puddles=[];
  function board(text,x,y,z,w=8,h=1,rotation=0,color='#ffe0a0') {
    const key=text+color;
    if(!signs.has(key)) {
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
      const c=canvas.getContext('2d');c.fillStyle='#172d30';c.fillRect(0,0,512,96);
      c.fillStyle=color;c.fillRect(0,0,512,5);c.fillRect(0,91,512,5);
      c.font='600 48px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,50,490);
      const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
      signs.set(key,new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));
    }
    const mesh=new T.Mesh(new T.PlaneGeometry(w,h),signs.get(key));mesh.position.set(x,y,z);mesh.rotation.y=rotation;scene.add(mesh);
  }
  const shopNames=['巷口便利商店 24H','阿伯牛肉麵','深夜食堂・熱炒','洗衣 • LAUNDRY','中山咖啡 COFFEE','台灣茶舖'];
  for(let ix=0;ix<4;ix++)for(let iz=0;iz<4;iz++) {
    const cx=roads[ix]+45,cz=roads[iz]+45;
    for(const side of [-1,1])for(let j=0;j<4;j++) {
      const x=cx-25+j*16.5,z=cz+side*32.65,face=z+side*.09;
      const shop=(ix+iz+j)%shopNames.length;
      // Recessed warm interiors, display shelves and frames behind the arcade.
      box(x,1.5,z,11,2.6,.12,'#6b573d',scene,true);
      for(let shelf=0;shelf<3;shelf++) {
        box(x, .65+shelf*.65,face,9,.08,.18,'#b8a58a');
        for(let item=0;item<12;item++)box(x-4.2+item*.75,.88+shelf*.65,face+side*.12,.36,.33,.18,['#be654b','#bac8a4','#e4ba66'][item%3]);
      }
      for(const dx of [-5.5,0,5.5])box(x+dx,1.5,face+side*.22,.12,2.7,.15,'#263a3e');
      board(shopNames[shop],x,3,z+side*.35,11,.9,side===1?0:Math.PI,shop===0?'#99efba':'#ffcf92');
      box(x,3.7,z+side*1.2,12,.15,2.4,shop===0?'#477969':'#8c564d');
      for(let k=0;k<6;k++)box(x-5+k*2,3.55,z+side*2.35,1,.28,.12,'#c5b695');
      // Window ledges, individual air conditioners, rooftop equipment.
      for(let floor=0;floor<3;floor++) {
        box(x+4,6+floor*3.6,z+side*.3,1.5,.75,.65,'#8d9994');
        box(x+4,6+floor*3.6,z+side*.65,1.1,.4,.05,'#344548');
        box(x-2,5.1+floor*3.6,z+side*.2,3,.14,.65,'#687678');
      }
      if(j%2===0) {
        box(x+6,.7,z+side*1.4,.9,1.4,.8,'#345d54');
        box(x+6,1.43,z+side*1.4,1,.1,.9,'#8b9b8b');
      }
      // Parked scooters: wheels, saddles, leg shields and mirrors.
      for(let k=0;k<3;k++) {
        const sx=x-3+k*1.65,sz=z+side*2.5;
        box(sx,.45,sz,.45,.7,1.65,'#18262c');box(sx,.8,sz,.65,.45,1.15,['#947069','#566d77','#b5aea1'][k]);
        box(sx,1.04,sz-side*.2,.58,.13,.7,'#18262c');box(sx,1.25,sz+side*.55,.6,.6,.18,'#73898c');
        box(sx,1.55,sz+side*.55,.9,.08,.1,'#bbc6bd');
      }
    }
    // Night-market cart, stools, lanterns and a few diners in the side lane.
    const x=cx-33.5,z=cz-8;
    box(x,1,z,2,1.7,4,'#869591');box(x,2.65,z,3,.25,5,'#b25942');
    for(const dz of [-1.7,1.7])box(x,1.9,z+dz,.1,1.5,.1,'#b9b6a0');
    board('關東煮 • 宵夜',x-1.1,2,z,3.7,.8,-Math.PI/2);
    for(const dz of [-1.4,0,1.4]) {box(x-2,.48,z+dz,.6,.9,.6,'#a7523e');box(x-1.4,2.1,z+dz,.35,.45,.35,'#ffb96a',scene,true)}
    // A glass bus shelter facing the cross street.
    box(cx+8,2.9,cz-33.5,8,.18,2.4,'#415c60');
    for(const dx of [4.5,11.5])box(cx+dx,1.45,cz-33.5,.12,2.9,.12,'#8dada9');
    box(cx+8,.7,cz-33.3,5,.18,.75,'#9b8c6b');
    board('公車站 BUS • 307',cx+8,2.5,cz-34.1,6,.65,Math.PI,'#b6e8d5');
    box(cx+12,1.5,cz-33.7,.9,2.8,.25,'#ced9c6',scene,true);
  }
  const lampGeo=new T.SphereGeometry(.34,10,8),lampOn=['#ff5144','#ffca60','#80efa7'],lampOff='#1d2626';
  // 燈亮時的柔光暈（additive sprite），讓紅綠燈在遠處一眼可辨
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=64;const gctx=glowCanvas.getContext('2d');const grad=gctx.createRadialGradient(32,32,0,32,32,32);grad.addColorStop(0,'rgba(255,255,255,.95)');grad.addColorStop(.35,'rgba(255,255,255,.4)');grad.addColorStop(1,'rgba(255,255,255,0)');gctx.fillStyle=grad;gctx.fillRect(0,0,64,64);const glowTex=new T.CanvasTexture(glowCanvas);
  for(const x of roads)for(const z of roads)for(const axis of [0,1])for(const side of [-1,1]) {
    const g=new T.Group();g.position.set(x+side*(axis?16:12),0,z+side*(axis?12:16));g.rotation.y=(axis?Math.PI/2:0)+(side===-1?Math.PI:0);scene.add(g);
    // 立柱＋橫跨車道的懸臂，末端掛橫式號誌頭（面向 +z 來車）
    box(0,3.4,0,.24,6.8,.24,'#6d827f',g);
    const armL=8,hx=-armL+.4;box(-armL/2,6.85,0,armL,.2,.2,'#5f7370',g);box(hx,6.5,0,.2,.9,.2,'#5f7370',g);
    box(hx,5.95,-.16,2.6,1.35,.12,'#3a4d2f',g);           // 黃綠背板（台灣式）
    box(hx,5.95,0,2.15,1,.5,'#141d1f',g);                 // 燈箱
    const bulbs=[],glows=[];
    for(let i=0;i<3;i++){
      const lx=hx-.62+i*.62;
      const m=new T.Mesh(lampGeo,new T.MeshBasicMaterial({color:lampOff}));m.position.set(lx,5.95,.28);g.add(m);bulbs.push(m);
      box(lx,6.34,.36,.62,.1,.55,'#0e1416',g);            // 遮陽罩
      const sp=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:lampOn[i],transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false}));sp.position.set(lx,5.95,.55);sp.scale.setScalar(1.7);sp.visible=false;g.add(sp);glows.push(sp);
    }
    signals.push({bulbs,glows,axis});
    box(x+ (axis?side*16:side*5.5),.07,z+(axis?side*5.5:side*16),axis?.35:10,.04,axis?10:.35,'#d9dfce');
  }
  // Soft additive light pools on asphalt: an inexpensive wet-road treatment.
  const c=document.createElement('canvas');c.width=c.height=64;const cc=c.getContext('2d');const gradient=cc.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,.55)');gradient.addColorStop(.4,'rgba(255,255,255,.18)');gradient.addColorStop(1,'rgba(255,255,255,0)');cc.fillStyle=gradient;cc.fillRect(0,0,64,64);
  const texture=new T.CanvasTexture(c),poolGeo=new T.PlaneGeometry(1,1);
  for(const x of roads)for(let z=-165;z<180;z+=25)for(const side of [-1,1]) {
    const m=new T.Mesh(poolGeo,new T.MeshBasicMaterial({map:texture,color:side===1?'#ffb574':'#68b8bc',transparent:true,opacity:.34,depthWrite:false,blending:T.AdditiveBlending}));m.rotation.x=-Math.PI/2;m.position.set(x+side*8,.095,z);m.scale.set(5,13,1);scene.add(m);puddles.push(m);
  }
  const people=[];const count=preview?64:144;
  const personMesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({roughness:.9}),count*6);
  personMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);personMesh.frustumCulled=false;scene.add(personMesh);
  const umbrellas=new T.InstancedMesh(new T.ConeGeometry(.85,.35,8),new T.MeshStandardMaterial({roughness:.45,side:T.DoubleSide}),count);umbrellas.instanceMatrix.setUsage(T.DynamicDrawUsage);umbrellas.frustumCulled=false;scene.add(umbrellas);
  const dummy=new T.Object3D(),color=new T.Color();
  for(let i=0;i<count;i++) {
    const ix=i%4,iz=Math.floor(i/4)%4,side=i%2?1:-1;
    people.push({cx:roads[ix]+45,cz:roads[iz]+45,side,offset:rand()*60,speed:.55+rand()*.65,cross:i%6===0,wait:i%5===0});
    const coat=['#c3af86','#577d81','#ab6250','#789271','#b3bcc1'][i%5];
    for(let part=0;part<6;part++)personMesh.setColorAt(i*6+part,color.set(part===0?'#bd9880':part<4?coat:'#25333d'));
    umbrellas.setColorAt(i,color.set(['#394859','#87564f','#477c75','#b79b61'][i%4]));
  }
  function signal(axis,time){
    const phase=((time%32)+32)%32,local=(phase+(axis===0?0:16))%32;
    return {color:local<12?'green':local<15?'amber':'red',remaining:Math.ceil(local<12?12-local:local<15?15-local:32-local)};
  }
  function stopAt(p,t,time,front=2.5) {
    const axis=Math.abs(t.z)>.7?0:1;if(signal(axis,time).color==='green')return false;
    const along=axis===0?p.z:p.x,dir=axis===0?t.z:t.x;
    return roads.some(r=>{const distance=(r-along)*Math.sign(dir)-front;return distance>=16&&distance<22;});
  }
  function update(time,raining) {
    for(const s of signals){const active={red:0,amber:1,green:2}[signal(s.axis,time).color];s.bulbs.forEach((m,i)=>m.material.color.set(i===active?['#ff5144','#ffca60','#80efa7'][i]:'#1d2626'));if(s.glows)s.glows.forEach((sp,i)=>{sp.visible=i===active})}
    for(const p of puddles)p.visible=raining;
    umbrellas.visible=raining;
    people.forEach((p,i)=>{
      const progress=(p.offset+time*p.speed)%112,forward=progress<56;
      let x=p.cx-28+(forward?progress:112-progress),z=p.cz+p.side*35.4;
      let crossing=false;
      if(p.cross){
        const phase=time%32,cycle=Math.floor(time/32),fraction=T.MathUtils.clamp((phase-16)/12,0,1);
        x=p.cx-45+(cycle%2?1-fraction:fraction)*32-16;
        z=p.cz-45+13+(i%3-1)*.65;
        crossing=phase>=16&&phase<28;
      }
      const walk=(p.cross?!crossing:p.wait)?0:Math.sin(time*p.speed*7+i)*.35;
      const px=!p.cross&&p.wait?p.cx-2+(i%4)*1.1:x;
      const parts=[[0,1.67,0,.28,.32,.28],[0,1.15,0,.48,.65,.3],[-.32,1.14,walk*.35,.14,.6,.15],[.32,1.14,-walk*.35,.14,.6,.15],[-.14,.53,-walk*.45,.18,.65,.2],[.14,.53,walk*.45,.18,.65,.2]];
      parts.forEach((a,j)=>{dummy.position.set(px+a[2],a[1]+.3,z+a[0]);dummy.scale.set(a[5],a[4],a[3]);dummy.rotation.set(0,0,0);dummy.updateMatrix();personMesh.setMatrixAt(i*6+j,dummy.matrix)});
      dummy.position.set(px,2.5,z);dummy.scale.setScalar(1);dummy.updateMatrix();umbrellas.setMatrixAt(i,dummy.matrix);
    });personMesh.instanceMatrix.needsUpdate=true;umbrellas.instanceMatrix.needsUpdate=true;
  }
  return {update,stopAt,signal,count};
}
