import * as T from './vendor/three.module.js';

// Reuse static city batches; reserve moving sprites for steam and light halos.
export function atmosphere({scene,box,roads,rand,preview}) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,32);
  gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.16,'#ffffffaa');gradient.addColorStop(1,'#ffffff00');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const glow=new T.CanvasTexture(canvas),steam=[];
  const shopMaterials=['深夜食堂  宵夜・熱炒','便利商店  OPEN 24H','中山咖啡  COFFEE','機車行  SCOOTER'].map((label,i)=>{
    const c=document.createElement('canvas');c.width=512;c.height=80;const t=c.getContext('2d');t.fillStyle=['#633f32','#356955','#425b62','#5e4e3b'][i];t.fillRect(0,0,512,80);t.fillStyle='#ffe1aa';t.font='bold 37px sans-serif';t.textAlign='center';t.fillText(label,256,54);
    const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;return new T.MeshBasicMaterial({map:texture});
  });
  // Fine aggregate adds road grain without a large downloaded texture.
  const asphalt=document.createElement('canvas');asphalt.width=asphalt.height=128;const ac=asphalt.getContext('2d');ac.fillStyle='#29383d';ac.fillRect(0,0,128,128);
  for(let i=0;i<6500;i++){const n=Math.floor(rand()*30+30);ac.fillStyle=`rgb(${n},${n+12},${n+16})`;ac.fillRect(rand()*128,rand()*128,1,1)}
  const roadTexture=new T.CanvasTexture(asphalt);roadTexture.colorSpace=T.SRGBColorSpace;roadTexture.wrapS=roadTexture.wrapT=T.RepeatWrapping;roadTexture.repeat.set(4,72);
  const roadMat=new T.MeshStandardMaterial({map:roadTexture,roughness:.6,metalness:.18}),roadGeo=new T.PlaneGeometry(22,430);
  for(const a of roads)for(const axis of [0,1]){const m=new T.Mesh(roadGeo,roadMat);m.rotation.x=-Math.PI/2;m.rotation.z=axis?Math.PI/2:0;m.position.set(axis?0:a,.034+axis*.002,axis?a:0);scene.add(m)}
  const leafGeo=new T.IcosahedronGeometry(1,1),trees=[];
  function halo(parent,x,y,z,color,size) {
    const sprite=new T.Sprite(new T.SpriteMaterial({map:glow,color,transparent:true,opacity:.26,depthWrite:false,blending:T.AdditiveBlending}));sprite.position.set(x,y,z);sprite.scale.setScalar(size);parent.add(sprite);return sprite;
  }
  for(let ix=0;ix<4;ix++)for(let iz=0;iz<4;iz++) {
    const cx=roads[ix]+45,cz=roads[iz]+45;
    for(const side of [-1,1]) {
      // Side-street shops face north/south routes as well as east/west ones.
      const sx=cx+side*32.65;
      for(let j=0;j<3;j++){
        const sz=cz-8+j*8;
        box(sx,1.5,sz,.1,2.5,6.5,'#81664a',scene,true);
        for(const dz of [-3,0,3])box(sx+side*.15,1.5,sz+dz,.2,2.8,.12,'#2d4447');
        box(sx+side*.7,3.3,sz,1.5,.2,7.2,'#526d64');
        const board=new T.Mesh(new T.PlaneGeometry(7,.95),shopMaterials[(ix+iz+j)%4]);board.rotation.y=side*Math.PI/2;board.position.set(sx+side*1.5,2.9,sz);scene.add(board);
        for(const y of [6,9.6,13.2]){box(sx+side*.4,y,sz,.7,.65,1.3,'#9a9d8e');box(sx+side*.78,y,sz,.04,.38,.9,'#3f5357')}
      }
      for(const dz of [-22,22]){box(cx+side*35,1.7,cz+dz,.3,3,.3,'#615c48');trees.push([cx+side*35,4,cz+dz,1.5,2,1.5])}
      for(const dx of [-17,16]) {
        const x=cx+dx,z=cz+side*35;
        box(x,.45,z,2.2,.5,2.2,'#6f7470');box(x,2.1,z,.3,3.3,.3,'#615c48');
        trees.push([x,4.2,z,1.6,2.1,1.5],[x+.6,5.2,z,1.5,1.5,1.4]);
      }
      // Balconies, railings, drainpipes, laundry and plants break up facades.
      for(let j=0;j<4;j++) {
        const x=cx-25+j*16.5,z=cz+side*33;
        box(x-5.8,8,z,.13,10,.15,'#75817a');
        for(const y of [8.1,11.7]) {
          box(x-1,y,z+side*.55,4,.18,1.3,'#777d74');
          box(x-1,y+.9,z+side*1.15,4,.08,.08,'#9b9b86');
          for(let k=0;k<7;k++)box(x-2.8+k*.6,y+.45,z+side*1.15,.055,.9,.055,'#9b9b86');
          box(x+.3,y+.4,z+side*.7,.5,.6,.45,'#ac7862');box(x+.3,y+.85,z+side*.7,.6,.5,.6,'#536c4c');
          if(j%2===0)for(let k=0;k<3;k++)box(x-2.3+k*.65,y+.45,z+side*.55,.43,.7,.06,['#ac9c8f','#7f929c','#b48b79'][k]);
        }
        // Curb markings, drains and bollards.
        for(let k=0;k<5;k++)box(x-6+k*2.8,.26,cz+side*33.5,1.6,.08,.25,'#ae5b4d');
        box(x,.075,cz+side*34.5,1.2,.025,.55,'#14292e');
        for(let k=0;k<6;k++)box(x-.5+k*.2,.09,cz+side*34.5,.065,.02,.5,'#697976');
      }
    }
    // Occupied street-food tables with bowls and seated silhouettes.
    for(let j=0;j<2;j++) {
      const x=cx-35,z=cz+1+j*3.2;
      box(x,1.02,z,1.6,.12,1.3,'#b69872');box(x,.6,z,.18,.8,.18,'#64706a');
      for(const side of [-1,1]) {
        box(x,.53,z+side*1,.6,.15,.6,'#a95642');box(x,.95,z+side*1,.48,.65,.35,'#697f86');box(x,1.52,z+side*1,.3,.32,.3,'#bd9880');
        box(x,1.15,z+side*.35,.32,.13,.32,'#ded4b0');
      }
    }
    for(let i=0;i<(preview?2:5);i++) {
      const s=halo(scene,cx-33.5,2.3,cz-8,'#bac8c3',1);s.material.blending=T.NormalBlending;
      steam.push({sprite:s,x:cx-33.5,z:cz-8,phase:rand()*5});
    }
    for(const side of [-1,1])halo(scene,cx,3.8,cz+side*34,'#ffbd79',6);
  }
  const foliage=new T.InstancedMesh(leafGeo,new T.MeshStandardMaterial({color:'#42634f',roughness:1}),trees.length),dummy=new T.Object3D();
  trees.forEach((v,i)=>{dummy.position.set(...v.slice(0,3));dummy.scale.set(...v.slice(3));dummy.updateMatrix();foliage.setMatrixAt(i,dummy.matrix)});scene.add(foliage);
  return {
    vehicleLights(car) {for(const side of [-1,1])halo(car,side*.72,.82,2.2,'#fff2c8',2.3)},
    update(time){for(const p of steam){const age=(time*.6+p.phase)%3;p.sprite.position.set(p.x+Math.sin(age*2+p.phase)*.3,2.3+age,p.z);p.sprite.scale.setScalar(.6+age*.7);p.sprite.material.opacity=.19*Math.sin(age/3*Math.PI)}},
  };
}
