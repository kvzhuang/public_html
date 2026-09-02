/* 體素村莊 Voxel Village · 觀察模式
   three.js r128 · 小人自動挖方塊、蓋房、擴建 · 晝夜循環 · localStorage 存檔 */
(function () {
  'use strict';
  if (typeof THREE === 'undefined') { console.error('three.js 未載入'); return; }

  var TAU = Math.PI * 2;
  var W = 40, MAXY = 26;               // 世界寬度(x,z) 與最高高度
  var STORE = 'voxel-village-state-v1';
  var DAY_SECONDS = 96;                // 一整天(晝夜)real seconds @1x

  // 方塊種類
  var BT = { GRASS:1, DIRT:2, STONE:3, LOG:4, LEAVES:5, PLANK:6, SAND:7, WATER:8, GLASS:9, COBBLE:10, ROOF:11 };
  var COLORS = {
    1:0x5aa72e, 2:0x7c5a34, 3:0x8b929c, 4:0x6b4a2b, 5:0x3f8b32,
    6:0xc39a63, 7:0xdccb8a, 8:0x3f74d6, 9:0xbfe6ff, 10:0x9aa1ab, 11:0xa23b2e
  };
  function isSolid(t){ return t && t !== BT.WATER; }          // 可站立
  function isOpaque(t){ return t && t !== BT.WATER && t !== BT.GLASS; } // 遮擋(面剔除用)

  // ---- 狀態 ----
  var scene, camera, renderer, sun, moon, hemi, ambient, stars, glassMat, waterMat, mats = {};
  var boxGeo, instMeshes = {}, worldDirty = true;
  var blocks = new Map();               // "x,y,z" -> type
  var quarryCells = [], treeCols = [], plots = [];
  var agents = [];
  var time = 0.06, dayCount = 1, prevTime = 0.06;
  var speed = 1, paused = false, autoRotate = true;
  var cam = { theta: 0.9, phi: 0.95, radius: 62, tx: W/2, ty: 5, tz: W/2 };
  var clock, raf = 0, saveTimer = 0, hintTimer = 6;

  var el = {
    canvas: document.getElementById('scene'),
    skyIcon: document.getElementById('skyIcon'),
    dayText: document.getElementById('dayText'),
    hmText: document.getElementById('hmText'),
    log: document.getElementById('log'),
    pauseBtn: document.getElementById('pauseBtn'),
    speed: document.getElementById('speed'),
    spdText: document.getElementById('spdText'),
    rotateBtn: document.getElementById('rotateBtn'),
    resetBtn: document.getElementById('resetBtn'),
    hint: document.getElementById('hint')
  };

  var AGENT_DEFS = [
    { name:'阿明', color:0xff6b6b, plot:[9,9] },
    { name:'小華', color:0x5cc8ff, plot:[30,11] },
    { name:'阿傑', color:0xffd166, plot:[20,30] }
  ];

  // ============================ 方塊工具 ============================
  function key(x,y,z){ return x+','+y+','+z; }
  function get(x,y,z){ return blocks.get(x+','+y+','+z) || 0; }
  function setB(x,y,z,t){
    var k = x+','+y+','+z;
    if (!t) blocks.delete(k); else blocks.set(k, t);
    worldDirty = true;
  }
  function inBounds(x,z){ return x>=0 && z>=0 && x<W && z<W; }
  function columnTop(x,z){ // 最高「可站立」方塊 y；無則 -1
    for (var y = MAXY-1; y >= 0; y--){ if (isSolid(get(x,y,z))) return y; }
    return -1;
  }

  // ============================ 世界生成 ============================
  function hash(x,z){ var n = Math.sin(x*127.1 + z*311.7) * 43758.5453; return n - Math.floor(n); }
  function noise2(x,z){
    var xi=Math.floor(x), zi=Math.floor(z), xf=x-xi, zf=z-zi;
    var a=hash(xi,zi), b=hash(xi+1,zi), c=hash(xi,zi+1), d=hash(xi+1,zi+1);
    var u=xf*xf*(3-2*xf), v=zf*zf*(3-2*zf);
    return a*(1-u)+b*u + (c-a)*v*(1-u) + (d-b)*u*v;
  }
  function terrainHeight(x,z){
    return 3 + Math.round(noise2(x/9, z/9) * 3 + noise2(x/22, z/22) * 1.5);
  }

  function generateWorld(){
    blocks.clear(); quarryCells = []; treeCols = []; plots = [];
    var pond = { x:12, z:29, r:4 }, waterY = 3;

    for (var x=0; x<W; x++){
      for (var z=0; z<W; z++){
        var h = terrainHeight(x,z);
        var dPond = Math.hypot(x-pond.x, z-pond.z);
        var inPond = dPond < pond.r;
        if (inPond) h = Math.min(h, 1);            // 挖出湖床
        for (var y=0; y<=h; y++){
          if (y === 0) setB(x,y,z, BT.STONE);
          else if (y < h-1) setB(x,y,z, BT.STONE);
          else if (y < h) setB(x,y,z, BT.DIRT);
          else setB(x,y,z, inPond ? BT.SAND : BT.GRASS);
        }
        if (inPond){                                // 填水
          for (var wy=h+1; wy<=waterY; wy++) setB(x,wy,z, BT.WATER);
          if (dPond < pond.r+1.2 && !inPond) setB(x,h,z, BT.SAND);
        }
      }
    }

    // 採石場：中央一塊區域，小人會在此往下挖出礦坑
    for (var qx=18; qx<=23; qx++) for (var qz=15; qz<=20; qz++) quarryCells.push([qx,qz]);

    // 樹木
    var placed = 0, tries = 0;
    while (placed < 16 && tries < 400){
      tries++;
      var tx = 2 + Math.floor(Math.random()*(W-4));
      var tz = 2 + Math.floor(Math.random()*(W-4));
      if (nearPlot(tx,tz,3) || inQuarry(tx,tz) || Math.hypot(tx-pond.x,tz-pond.z)<pond.r+2) continue;
      var th = columnTop(tx,tz);
      if (get(tx,th,tz) !== BT.GRASS) continue;
      plantTree(tx, th, tz);
      treeCols.push([tx,tz]);
      placed++;
    }

    // 建地：整平並記錄
    AGENT_DEFS.forEach(function(d){
      var gy = flattenPlot(d.plot[0], d.plot[1], 3);
      plots.push({ cx:d.plot[0], cz:d.plot[1], gy:gy, foot:null });
    });
  }

  function plantTree(x, ground, z){
    var trunk = 3 + Math.floor(Math.random()*2);
    for (var i=1; i<=trunk; i++) setB(x, ground+i, z, BT.LOG);
    var top = ground + trunk;
    for (var lx=-2; lx<=2; lx++) for (var lz=-2; lz<=2; lz++) for (var ly=0; ly<=2; ly++){
      if (Math.abs(lx)===2 && Math.abs(lz)===2) continue;
      if (ly===2 && (Math.abs(lx)>1 || Math.abs(lz)>1)) continue;
      var yy = top-1+ly;
      if (inBounds(x+lx, z+lz) && get(x+lx,yy,z+lz)===0) setB(x+lx, yy, z+lz, BT.LEAVES);
    }
  }

  function flattenPlot(cx, cz, rad){
    var gy = terrainHeight(cx,cz);
    for (var x=cx-rad; x<=cx+rad; x++) for (var z=cz-rad; z<=cz+rad; z++){
      if (!inBounds(x,z)) continue;
      for (var y=MAXY-1; y>gy; y--) setB(x,y,z,0);   // 清掉上方
      for (var y2=0; y2<gy; y2++) if (!isSolid(get(x,y2,z))) setB(x,y2,z,BT.DIRT);
      setB(x,gy,z, BT.GRASS);
    }
    return gy;
  }

  function nearPlot(x,z,pad){
    return AGENT_DEFS.some(function(d){ return Math.abs(x-d.plot[0])<=3+pad && Math.abs(z-d.plot[1])<=3+pad; });
  }
  function inQuarry(x,z){ return x>=17 && x<=24 && z>=14 && z<=21; }

  // ============================ 房屋藍圖 ============================
  // 產生一個房間的方塊清單（依可建造順序：地板→牆(由下往上)→屋頂）
  function roomPlan(x0, x1, z0, z1, gy, doors){
    var plan = [], x, z, hgt;
    doors = doors || [];
    var isDoor = function(x,z,h){
      return doors.some(function(d){ return d.x===x && d.z===z && h<=d.h; });
    };
    // 地板
    for (x=x0; x<=x1; x++) for (z=z0; z<=z1; z++) plan.push({x:x, y:gy, z:z, t:BT.PLANK});
    // 牆（周邊），h=1..3
    for (hgt=1; hgt<=3; hgt++){
      for (x=x0; x<=x1; x++) for (z=z0; z<=z1; z++){
        var edge = (x===x0||x===x1||z===z0||z===z1);
        if (!edge) continue;
        if (isDoor(x,z,hgt)) continue;
        var isCorner = (x===x0||x===x1) && (z===z0||z===z1);
        var t = (hgt===2 && !isCorner) ? BT.GLASS : BT.COBBLE;   // 中層開窗
        plan.push({x:x, y:gy+hgt, z:z, t:t});
      }
    }
    // 屋頂
    for (x=x0; x<=x1; x++) for (z=z0; z<=z1; z++) plan.push({x:x, y:gy+4, z:z, t:BT.ROOF});
    return plan;
  }

  function initialPlan(cx, cz, gy){
    // 5x5 房屋，前方(z+2)中央開門
    return { blocks: roomPlan(cx-2, cx+2, cz-2, cz+2, gy, [{x:cx, z:cz+2, h:2}]),
             foot: {x0:cx-2,x1:cx+2,z0:cz-2,z1:cz+2} };
  }

  // 擴建：交替「加房間」與「加二樓」
  function expansionPlan(agent){
    var f = agent.foot, gy = agent.gy, cx = agent.home[0], cz = agent.home[1];
    var n = agent.expandCount;
    if (n % 2 === 0){
      // 往某方向加一個 4 格深的新房間
      var dirs = [[1,0],[0,1],[-1,0],[0,-1]];
      var dir = dirs[(n/2|0) % 4];
      var nx0, nx1, nz0, nz1, door;
      if (dir[0] === 1){ nx0=f.x1; nx1=f.x1+4; nz0=f.z0; nz1=f.z1; door={x:f.x1, z:cz, h:2}; }
      else if (dir[0] === -1){ nx0=f.x0-4; nx1=f.x0; nz0=f.z0; nz1=f.z1; door={x:f.x0, z:cz, h:2}; }
      else if (dir[1] === 1){ nz0=f.z1; nz1=f.z1+4; nx0=f.x0; nx1=f.x1; door={x:cx, z:f.z1, h:2}; }
      else { nz0=f.z0-4; nz1=f.z0; nx0=f.x0; nx1=f.x1; door={x:cx, z:f.z0, h:2}; }
      nx0=Math.max(1,nx0); nx1=Math.min(W-2,nx1); nz0=Math.max(1,nz0); nz1=Math.min(W-2,nz1);
      agent.foot = { x0:Math.min(f.x0,nx0), x1:Math.max(f.x1,nx1), z0:Math.min(f.z0,nz0), z1:Math.max(f.z1,nz1) };
      return roomPlan(nx0, nx1, nz0, nz1, gy, [door]);
    } else {
      // 加二樓（在原始 5x5 上方再疊一層）
      var g2 = gy + 4;
      return roomPlan(cx-2, cx+2, cz-2, cz+2, g2, [{x:cx+2, z:cz, h:2}]).map(function(b){
        // 二樓地板沿用屋頂，跳過重覆的地板層
        return b;
      }).filter(function(b){ return b.y > g2; }).concat(
        // 二樓地板改成 plank（把原屋頂那層留著當地板即可，這裡補窗與牆已含）
        []
      );
    }
  }

  // ============================ 小人 ============================
  function buildAgentMesh(color){
    var g = new THREE.Group();
    var mk = function(w,h,d,c){ return new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
        new THREE.MeshLambertMaterial({color:c})); };
    var skin = 0xf0c39a;
    var head = mk(0.5,0.5,0.5, skin); head.position.y = 1.35;
    var body = mk(0.5,0.6,0.28, color); body.position.y = 0.85;
    var armL = mk(0.16,0.55,0.16, color); armL.position.set(-0.33,0.9,0);
    var armR = mk(0.16,0.55,0.16, color); armR.position.set(0.33,0.9,0);
    var legL = mk(0.18,0.55,0.18, 0x33405c); legL.position.set(-0.13,0.28,0);
    var legR = mk(0.18,0.55,0.18, 0x33405c); legR.position.set(0.13,0.28,0);
    [head,body,armL,armR,legL,legR].forEach(function(m){ m.castShadow = true; g.add(m); });
    g.userData = { armL:armL, armR:armR, legL:legL, legR:legR };
    return g;
  }

  function makeAgent(def){
    var gy = terrainHeight(def.plot[0], def.plot[1]);
    var mesh = buildAgentMesh(def.color);
    scene.add(mesh);
    return {
      name: def.name, color: def.color, home: def.plot.slice(), gy: gy,
      pos: { x: def.plot[0]+3.5, y: gy+1, z: def.plot[1]+0.5 },
      mesh: mesh, state: 'seek', task: null, carry: 3,
      plan: null, planIndex: 0, foot: null, expandCount: 0,
      digTimer: 0, walkPhase: 0, facing: 0, idleTimer: 0, doneOnce: false
    };
  }

  function startPlan(agent, plan, foot){
    agent.plan = plan; agent.planIndex = 0;
    if (foot) agent.foot = foot;
  }

  function pickSource(agent){
    var best = null, bestD = 1e9, i, c, tp, d;
    // 1) 採石場
    for (i=0; i<quarryCells.length; i++){
      c = quarryCells[i]; tp = columnTop(c[0], c[1]);
      if (tp < 1) continue;
      d = Math.hypot(c[0]-agent.pos.x, c[1]-agent.pos.z);
      if (d < bestD){ bestD = d; best = {x:c[0], y:tp, z:c[1]}; }
    }
    if (best) return best;
    // 2) 樹木
    for (i=0; i<treeCols.length; i++){
      c = treeCols[i]; tp = columnTop(c[0], c[1]);
      if (tp < 1) continue;
      var tt = get(c[0], tp, c[1]);
      if (tt !== BT.LOG && tt !== BT.LEAVES) continue;
      d = Math.hypot(c[0]-agent.pos.x, c[1]-agent.pos.z);
      if (d < bestD){ bestD = d; best = {x:c[0], y:tp, z:c[1]}; }
    }
    if (best) return best;
    // 3) 後備：附近非建地的地表方塊
    for (var k=0; k<40; k++){
      var rx = 1+Math.floor(Math.random()*(W-2)), rz = 1+Math.floor(Math.random()*(W-2));
      if (nearPlot(rx,rz,1)) continue;
      tp = columnTop(rx,rz);
      if (tp >= 1){ return {x:rx, y:tp, z:rz}; }
    }
    return null;
  }

  function assignTask(agent){
    if (agent.carry <= 0){
      var src = pickSource(agent);
      if (src){ agent.task = { kind:'gather', block:src, stand:[src.x+0.5, src.z+0.5] }; return; }
    }
    if (agent.plan && agent.planIndex < agent.plan.length){
      // 跳過已存在的方塊
      while (agent.planIndex < agent.plan.length){
        var b = agent.plan[agent.planIndex];
        if (get(b.x,b.y,b.z) === b.t){ agent.planIndex++; continue; }
        agent.task = { kind:'build', block:b, stand:[b.x+0.5, b.z+0.5] };
        return;
      }
    }
    // 藍圖完成 → 擴建
    if (agent.plan && agent.planIndex >= agent.plan.length){
      if (!agent.doneOnce){ agent.doneOnce = true; addLog(agent.name + ' 蓋好了房子 🏠'); }
      agent.idleTimer -= 1;
      if (agent.idleTimer <= 0 && agent.expandCount < 4){
        var ext = expansionPlan(agent);
        if (ext && ext.length){
          agent.plan = agent.plan.concat(ext);
          agent.expandCount++;
          agent.doneOnce = false;
          addLog(agent.name + ' 開始擴建（第 ' + agent.expandCount + ' 期）🔨');
        }
        agent.idleTimer = 30;
      }
    }
    agent.task = null;
  }

  function doGather(agent){
    var b = agent.task.block;
    var t = get(b.x, b.y, b.z);
    if (t){
      setB(b.x, b.y, b.z, 0);
      agent.carry += 4;
      updateGroundBelow(b.x, b.y, b.z, t);
      if (Math.random() < 0.5){
        var what = (t===BT.LOG||t===BT.LEAVES) ? '砍了棵樹' : '挖到方塊';
        addLog(agent.name + ' ' + what + ' ⛏️（材料 ' + agent.carry + '）');
      }
    }
    agent.task = null; agent.state = 'seek';
  }

  function updateGroundBelow(x,y,z,removed){
    // 若挖掉草，露出的泥土頂變成草，較自然（僅非建地）
    if (removed === BT.GRASS && !nearPlot(x,z,0) && get(x,y-1,z) === BT.DIRT){
      setB(x,y-1,z, BT.GRASS);
    }
  }

  function doBuild(agent){
    var b = agent.task.block;
    if (get(b.x,b.y,b.z) !== b.t){
      setB(b.x, b.y, b.z, b.t);
      agent.carry -= 1;
      agent.planIndex++;
    } else {
      agent.planIndex++;
    }
    agent.task = null; agent.state = 'seek';
  }

  function updateAgent(agent, dt){
    if (agent.state === 'dig'){
      agent.digTimer -= dt;
      agent.mesh.userData.armR.rotation.x = -1.4 + Math.sin(clock.now*14)*0.7; // 揮動
      if (agent.digTimer <= 0){
        if (agent.task && agent.task.kind === 'gather') doGather(agent);
        else agent.state = 'seek';
      }
      return;
    }

    if (!agent.task) assignTask(agent);
    if (!agent.task){ // 沒事做 → 在家附近閒晃
      wander(agent, dt);
      return;
    }

    var st = agent.task.stand;
    var dx = st[0] - agent.pos.x, dz = st[1] - agent.pos.z;
    var dist = Math.hypot(dx, dz);
    var arrive = agent.task.kind === 'build' ? 0.9 : 0.6;

    if (dist > arrive){
      var spd = 3.0 * dt;
      var step = Math.min(spd, dist);
      agent.pos.x += dx/dist*step;
      agent.pos.z += dz/dist*step;
      agent.facing = Math.atan2(dx, dz);
      agent.walkPhase += dt * 12;
      followGround(agent, dt, true);
    } else {
      // 到位
      if (agent.task.kind === 'gather'){
        agent.state = 'dig'; agent.digTimer = 0.55;
      } else {
        doBuild(agent);
      }
      followGround(agent, dt, false);
    }
    placeMesh(agent);
  }

  function wander(agent, dt){
    if (!agent.wanderT || agent.wanderT <= 0){
      agent.wanderTarget = [ agent.home[0] + (Math.random()*6-3), agent.home[1] + (Math.random()*6-3) ];
      agent.wanderT = 2 + Math.random()*3;
    }
    agent.wanderT -= dt;
    var wt = agent.wanderTarget;
    var dx = wt[0]-agent.pos.x, dz = wt[1]-agent.pos.z, d = Math.hypot(dx,dz);
    if (d > 0.4){
      var step = Math.min(1.4*dt, d);
      agent.pos.x += dx/d*step; agent.pos.z += dz/d*step;
      agent.facing = Math.atan2(dx,dz); agent.walkPhase += dt*8;
      followGround(agent, dt, true);
    } else { followGround(agent, dt, false); }
    // 閒晃時偶爾重新找活
    if (Math.random() < 0.02) assignTask(agent);
    placeMesh(agent);
  }

  function followGround(agent, dt, moving){
    var gx = Math.floor(agent.pos.x), gz = Math.floor(agent.pos.z);
    if (!inBounds(gx,gz)){ agent.pos.x = Math.max(0.5, Math.min(W-0.5, agent.pos.x));
      agent.pos.z = Math.max(0.5, Math.min(W-0.5, agent.pos.z)); return; }
    var top = columnTop(gx, gz);
    var targetY = (top >= 0 ? top+1 : 1);
    agent.pos.y += (targetY - agent.pos.y) * Math.min(1, dt*10);
    var swing = moving ? Math.sin(agent.walkPhase) * 0.6 : 0;
    var u = agent.mesh.userData;
    u.legL.rotation.x = swing; u.legR.rotation.x = -swing;
    u.armL.rotation.x = -swing*0.7; if (agent.state!=='dig') u.armR.rotation.x = swing*0.7;
  }

  function placeMesh(agent){
    agent.mesh.position.set(agent.pos.x, agent.pos.y, agent.pos.z);
    agent.mesh.rotation.y = agent.facing;
  }

  // ============================ 渲染（InstancedMesh） ============================
  function materialFor(t){
    if (mats[t]) return mats[t];
    var m;
    if (t === BT.WATER){ m = new THREE.MeshLambertMaterial({color:0xffffff, transparent:true, opacity:0.72}); m.depthWrite=false; waterMat=m; }
    else if (t === BT.GLASS){ m = new THREE.MeshLambertMaterial({color:0xffffff, transparent:true, opacity:0.55, emissive:0xffcf6b, emissiveIntensity:0}); glassMat=m; }
    else m = new THREE.MeshLambertMaterial({color:0xffffff});
    mats[t] = m; return m;
  }

  var _c = new THREE.Color(), _o = new THREE.Object3D();
  function rebuildInstances(){
    var byType = {}, kk, t, parts, x, y, z;
    blocks.forEach(function(tt, k){
      var p = k.split(','); x=+p[0]; y=+p[1]; z=+p[2];
      // 面剔除：任一鄰格非遮擋才顯示
      if (isOpaque(get(x+1,y,z)) && isOpaque(get(x-1,y,z)) &&
          isOpaque(get(x,y+1,z)) && isOpaque(get(x,y-1,z)) &&
          isOpaque(get(x,y,z+1)) && isOpaque(get(x,y,z-1))) return;
      (byType[tt] || (byType[tt] = [])).push([x,y,z]);
    });
    Object.keys(instMeshes).forEach(function(ts){
      if (!byType[ts]){ instMeshes[ts].count = 0; instMeshes[ts].instanceMatrix.needsUpdate = true; }
    });
    Object.keys(byType).forEach(function(ts){
      t = +ts; var list = byType[ts], mesh = instMeshes[ts];
      if (!mesh || mesh.userData.cap < list.length){
        if (mesh){ scene.remove(mesh); mesh.dispose(); }
        var cap = Math.ceil(list.length*1.4) + 32;
        mesh = new THREE.InstancedMesh(boxGeo, materialFor(t), cap);
        mesh.userData.cap = cap; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.castShadow = (t !== BT.WATER); mesh.receiveShadow = (t !== BT.WATER);
        instMeshes[ts] = mesh; scene.add(mesh);
      }
      var base = COLORS[t];
      for (var i=0; i<list.length; i++){
        var a = list[i];
        _o.position.set(a[0]+0.5, a[1]+0.5, a[2]+0.5);
        _o.updateMatrix();
        mesh.setMatrixAt(i, _o.matrix);
        var v = 0.86 + hash(a[0]*3+a[2], a[1]*7+a[0]) * 0.28;   // 每格輕微明暗變化
        _c.setHex(base).multiplyScalar(v);
        mesh.setColorAt(i, _c);
      }
      mesh.count = list.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
    worldDirty = false;
  }

  // ============================ 晝夜 ============================
  var dayC = new THREE.Color(0x8ec9ee), duskC = new THREE.Color(0xef9a4e),
      nightC = new THREE.Color(0x0a1330), _sky = new THREE.Color();
  function updateSky(){
    var elv = Math.sin(time*TAU);
    var day = clamp((elv+0.05)/0.35, 0, 1);
    var twi = clamp(1 - Math.abs(elv)/0.22, 0, 1);
    _sky.copy(nightC).lerp(dayC, day).lerp(duskC, twi*0.55);
    scene.background = _sky;
    if (scene.fog) scene.fog.color.copy(_sky);

    var ang = time*TAU;
    var sx = Math.cos(ang), sy = Math.sin(ang);
    sun.position.set(cam.tx + sx*70, sy*80, cam.tz + 30 + sx*20);
    sun.intensity = day*1.15;
    moon.position.set(cam.tx - sx*70, -sy*80, cam.tz + 30 - sx*20);
    moon.intensity = (1-day)*0.32;
    ambient.intensity = 0.16 + day*0.28;
    hemi.intensity = 0.18 + day*0.42;

    if (glassMat) glassMat.emissiveIntensity = (1-day)*0.95;   // 夜晚窗戶發光
    if (stars) stars.material.opacity = (1-day)*0.9;

    // HUD 時鐘
    var hours = (time*24 + 6) % 24;
    var hh = Math.floor(hours), mm = Math.floor((hours-hh)*60);
    el.hmText.textContent = pad(hh)+':'+pad(mm);
    el.dayText.textContent = '第 ' + dayCount + ' 天';
    el.skyIcon.textContent = day > 0.35 ? '☀️' : (twi > 0.3 ? '🌅' : '🌙');
  }
  function pad(n){ return (n<10?'0':'')+n; }
  function clamp(v,a,b){ return v<a?a:(v>b?b:v); }

  function makeStars(){
    var g = new THREE.BufferGeometry(), n = 600, arr = new Float32Array(n*3);
    for (var i=0; i<n; i++){
      var u = Math.random(), v = Math.random();
      var th = u*TAU, ph = Math.acos(2*v-1), r = 180;
      arr[i*3] = cam.tx + r*Math.sin(ph)*Math.cos(th);
      arr[i*3+1] = Math.abs(r*Math.cos(ph))*0.9 + 20;
      arr[i*3+2] = cam.tz + r*Math.sin(ph)*Math.sin(th);
    }
    g.setAttribute('position', new THREE.BufferAttribute(arr,3));
    var m = new THREE.PointsMaterial({color:0xffffff, size:1.1, transparent:true, opacity:0, sizeAttenuation:false});
    stars = new THREE.Points(g, m); scene.add(stars);
  }

  // ============================ 存檔 ============================
  function encodeBlocks(){
    var pos = [], typ = [];
    blocks.forEach(function(t, k){
      var p = k.split(','); pos.push((+p[0]) | ((+p[2])<<6) | ((+p[1])<<12)); typ.push(t);
    });
    return { p: pos, t: typ };
  }
  function decodeBlocks(enc){
    blocks.clear();
    for (var i=0; i<enc.p.length; i++){
      var n = enc.p[i], x = n & 63, z = (n>>6) & 63, y = (n>>12) & 63;
      blocks.set(x+','+y+','+z, enc.t[i]);
    }
    worldDirty = true;
  }
  function save(){
    try {
      var data = {
        v:1, time:time, dayCount:dayCount, speed:speed, autoRotate:autoRotate,
        cam:cam, blocks:encodeBlocks(),
        quarryCells:quarryCells, treeCols:treeCols,
        agents: agents.map(function(a){
          return { name:a.name, color:a.color, home:a.home, gy:a.gy, pos:a.pos,
            carry:a.carry, planIndex:a.planIndex, foot:a.foot, expandCount:a.expandCount,
            doneOnce:a.doneOnce, idleTimer:a.idleTimer,
            plan: a.plan ? a.plan.map(function(b){ return [b.x,b.y,b.z,b.t]; }) : null };
        })
      };
      localStorage.setItem(STORE, JSON.stringify(data));
    } catch(e){ /* 容量或隱私模式 */ }
  }
  function load(){
    try {
      var raw = localStorage.getItem(STORE);
      if (!raw) return false;
      var d = JSON.parse(raw);
      if (!d || d.v !== 1 || !d.blocks) return false;
      decodeBlocks(d.blocks);
      quarryCells = d.quarryCells || []; treeCols = d.treeCols || [];
      time = d.time; prevTime = d.time; dayCount = d.dayCount || 1;
      speed = d.speed || 1; autoRotate = d.autoRotate !== false;
      if (d.cam) cam = d.cam;
      agents = (d.agents || []).map(function(sa){
        var mesh = buildAgentMesh(sa.color); scene.add(mesh);
        return { name:sa.name, color:sa.color, home:sa.home, gy:sa.gy,
          pos:sa.pos, mesh:mesh, state:'seek', task:null, carry:sa.carry,
          plan: sa.plan ? sa.plan.map(function(b){ return {x:b[0],y:b[1],z:b[2],t:b[3]}; }) : null,
          planIndex: sa.planIndex||0, foot:sa.foot, expandCount:sa.expandCount||0,
          digTimer:0, walkPhase:0, facing:0, idleTimer:sa.idleTimer||0, doneOnce:!!sa.doneOnce };
      });
      return agents.length > 0;
    } catch(e){ return false; }
  }

  // ============================ 記錄 ============================
  var logRows = [];
  function addLog(text){
    logRows.push(text); if (logRows.length > 8) logRows.shift();
    if (!el.log) return;
    el.log.innerHTML = logRows.slice().reverse().map(function(t){
      return '<div class="row">'+t+'</div>';
    }).join('');
  }

  // ============================ 相機 / 輸入 ============================
  function applyCamera(){
    var sp = Math.sin(cam.phi), cp = Math.cos(cam.phi);
    camera.position.set(
      cam.tx + cam.radius*sp*Math.cos(cam.theta),
      cam.ty + cam.radius*cp,
      cam.tz + cam.radius*sp*Math.sin(cam.theta)
    );
    camera.lookAt(cam.tx, cam.ty, cam.tz);
  }
  function bindInput(){
    var dragging = false, px=0, py=0;
    var down = function(e){ dragging = true; var p = point(e); px=p.x; py=p.y; hideHint(); };
    var move = function(e){
      if (!dragging) return; var p = point(e);
      cam.theta -= (p.x-px)*0.006; cam.phi -= (p.y-py)*0.006;
      cam.phi = clamp(cam.phi, 0.25, 1.4); px=p.x; py=p.y;
    };
    var up = function(){ dragging = false; };
    el.canvas.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    el.canvas.addEventListener('touchstart', function(e){ down(e); }, {passive:true});
    el.canvas.addEventListener('touchmove', function(e){ move(e); }, {passive:true});
    el.canvas.addEventListener('touchend', up);
    el.canvas.addEventListener('wheel', function(e){
      e.preventDefault();
      cam.radius = clamp(cam.radius + (e.deltaY>0?4:-4), 24, 120);
    }, {passive:false});

    el.pauseBtn.addEventListener('click', function(){
      paused = !paused; el.pauseBtn.textContent = paused ? '▶ 繼續' : '⏸ 暫停';
    });
    el.speed.addEventListener('input', function(){
      speed = parseFloat(el.speed.value); el.spdText.textContent = speed+'x';
    });
    el.rotateBtn.addEventListener('click', function(){
      autoRotate = !autoRotate;
      el.rotateBtn.textContent = '🔄 自動旋轉：' + (autoRotate?'開':'關');
    });
    el.resetBtn.addEventListener('click', function(){
      if (!confirm('要重新生成一個新世界嗎？目前進度將清除。')) return;
      localStorage.removeItem(STORE);
      resetWorld();
    });
    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', function(){ if (document.hidden) save(); });
    window.addEventListener('resize', onResize);
  }
  function point(e){
    if (e.touches && e.touches[0]) return {x:e.touches[0].clientX, y:e.touches[0].clientY};
    return {x:e.clientX, y:e.clientY};
  }
  function hideHint(){ if (el.hint){ el.hint.style.transition='opacity .6s'; el.hint.style.opacity='0'; } }
  function onResize(){
    camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ============================ 初始化 / 主迴圈 ============================
  function initThree(){
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x8ec9ee, 0.011);
    camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 500);
    renderer = new THREE.WebGLRenderer({canvas:el.canvas, antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 1.6));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    boxGeo = new THREE.BoxGeometry(1,1,1);

    hemi = new THREE.HemisphereLight(0xbfe0ff, 0x4a5a3a, 0.5); scene.add(hemi);
    ambient = new THREE.AmbientLight(0xffffff, 0.3); scene.add(ambient);
    sun = new THREE.DirectionalLight(0xfff2d6, 1.1); sun.castShadow = true;
    sun.shadow.mapSize.set(2048,2048);
    var sc = sun.shadow.camera; sc.left=-W*0.75; sc.right=W*0.75; sc.top=W*0.75; sc.bottom=-W*0.75;
    sc.near=1; sc.far=260; sun.shadow.bias = -0.0005;
    sun.target.position.set(cam.tx, 0, cam.tz); scene.add(sun); scene.add(sun.target);
    moon = new THREE.DirectionalLight(0x9db4ff, 0.3); scene.add(moon);
    makeStars();
    clock = { now: 0 };
  }

  function resetWorld(){
    // 清除既有 instanced/agent
    Object.keys(instMeshes).forEach(function(ts){ scene.remove(instMeshes[ts]); instMeshes[ts].dispose(); });
    instMeshes = {};
    agents.forEach(function(a){ scene.remove(a.mesh); });
    agents = [];
    logRows = []; if (el.log) el.log.innerHTML = '';
    time = 0.06; prevTime = 0.06; dayCount = 1;

    generateWorld();
    agents = AGENT_DEFS.map(makeAgent);
    agents.forEach(function(a){
      var ip = initialPlan(a.home[0], a.home[1], a.gy);
      startPlan(a, ip.blocks, ip.foot);
    });
    worldDirty = true;
    addLog('🌱 新世界誕生，三位居民開始動工');
  }

  function frame(){
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, clock.dtReal = (clock.last ? (performance.now()-clock.last)/1000 : 0.016));
    clock.last = performance.now();
    clock.now += dt;

    if (!paused){
      var sdt = dt * speed;
      // 時間推進
      time += sdt / DAY_SECONDS;
      if (time >= 1){ time -= 1; }
      if (prevTime > 0.7 && time < 0.3){ dayCount++; }   // 過午夜換日
      prevTime = time;
      // 小人
      for (var i=0; i<agents.length; i++) updateAgent(agents[i], sdt);
    }

    if (worldDirty) rebuildInstances();
    updateSky();

    if (autoRotate && !paused) cam.theta += dt*0.06;
    applyCamera();

    saveTimer += dt;
    if (saveTimer > 5){ saveTimer = 0; save(); }
    if (hintTimer > 0){ hintTimer -= dt; if (hintTimer <= 0) hideHint(); }

    renderer.render(scene, camera);
  }

  // ---- 啟動 ----
  initThree();
  bindInput();
  el.speed.value = 1; el.spdText.textContent = '1x';
  if (load()){
    el.rotateBtn.textContent = '🔄 自動旋轉：' + (autoRotate?'開':'關');
    el.speed.value = speed; el.spdText.textContent = speed+'x';
    addLog('📂 已載入上次的村莊進度');
  } else {
    resetWorld();
  }
  worldDirty = true;
  frame();

  // 對外除錯用
  window.__voxel = {
    blocks: blocks,
    get agents(){ return agents; },
    state: function(){ return { time:time, day:dayCount, blocks:blocks.size }; },
    // 脫離渲染直接推進模擬（供無頭測試；正常執行不會用到）
    sim: function(secs){
      var dt = 1/30, steps = Math.round(secs/dt);
      for (var s=0; s<steps; s++){
        for (var i=0; i<agents.length; i++) updateAgent(agents[i], dt);
        time += dt / DAY_SECONDS; if (time>=1) time-=1;
      }
      return { blocks: blocks.size, agents: agents.map(function(a){
        return { name:a.name, carry:a.carry, planIndex:a.planIndex,
          planLen:a.plan?a.plan.length:0, expand:a.expandCount, state:a.state };
      }) };
    },
    setTime: function(t){ time = t; prevTime = t; updateSky(); }
  };
})();
