// ============================================
// TSP — Traveling Salesman Problem 視覺化
// ============================================

var rand = fxrand;
var sz, margin;
var cities = [];
var numCities;
var bestRoute = [];
var currentRoute = [];
var bestDist = Infinity;
var currentDist = 0;
var lastAlgo = '';
var doneRoute = [];  // frozen copy for done state
var doneDist = 0;

var phase = 'idle';
var stepIdx = 0;
var visited = [];

var opt2_i=0, opt2_j=0, opt2_improved=false, opt2_pass=0;
var saTemp=0, saCooling=0, saSteps=0, saTotal=0;

var COL_BG='#0F1923', COL_CITY='#FBBF24', COL_CITY_VISITED='#818CF8';
var COL_ROUTE_NN='#60A5FA', COL_ROUTE_2OPT='#F472B6', COL_ROUTE_SA='#FB923C';
var COL_ROUTE_DONE='#34D399', COL_CANDIDATE='#334155', COL_SWAP_HL='#F43F5E';
var COL_LABEL='#94A3B8', COL_START='#34D399';

function setup() {
  var ctrlH=document.getElementById('controls').offsetHeight||50;
  var statusH=document.getElementById('status').offsetHeight||20;
  sz=Math.min(window.innerWidth,window.innerHeight-ctrlH-statusH-10);
  sz=Math.max(sz,200); margin=sz*0.08;
  createCanvas(sz,sz).parent('tsp-container');
  textFont('monospace');
  generateCities();
  bind('btn-nn',startNN); bind('btn-2opt',start2Opt);
  bind('btn-sa',startSA); bind('btn-new',newCities);
  bind('btn-save',function(){saveCanvas('tsp-'+Date.now(),'png');});
  noLoop();
  redraw();
}

function bind(id,fn){var e=document.getElementById(id);e.ontouchend=function(ev){ev.preventDefault();fn();};e.onclick=fn;}

function newCities(){generateCities();phase='idle';lastAlgo='';doneRoute=[];redraw();}

function generateCities(){
  numCities=Math.floor(rand()*20)+15;
  cities=[];var pad=margin+sz*0.06,area=sz-pad*2;
  for(var i=0;i<numCities;i++)cities.push({x:pad+rand()*area,y:pad+rand()*area});
  bestRoute=[];currentRoute=[];bestDist=Infinity;currentDist=0;doneRoute=[];
  setStatus('Generated <span>'+numCities+'</span> cities. Pick an algorithm.');
}

function cityDist(a,b){var dx=cities[a].x-cities[b].x,dy=cities[a].y-cities[b].y;return Math.sqrt(dx*dx+dy*dy);}
function routeDist(r){var d=0;for(var i=0;i<r.length;i++)d+=cityDist(r[i],r[(i+1)%r.length]);return d;}

function finishAlgo(name){
  lastAlgo=name;
  doneRoute=currentRoute.slice();
  doneDist=routeDist(doneRoute);
  bestRoute=doneRoute.slice();
  bestDist=doneDist;
  phase='done'; // tick() will stop calling itself because phase is not nn/2opt/sa
  setStatus(name+' done! Distance: <span>'+Math.round(doneDist)+'</span>');
  redraw(); // one final draw with doneRoute
}

// ── NN ──

function tick(){
  if(phase==='nn'||phase==='2opt'||phase==='sa'){
    redraw();
    setTimeout(tick, 33); // ~30fps manual loop
  }
}

function startNN(){
  if(phase!=='idle'&&phase!=='done')return;
  phase='nn';lastAlgo='NN';
  currentRoute=[Math.floor(rand()*numCities)];
  visited=new Array(numCities).fill(false);
  visited[currentRoute[0]]=true;stepIdx=1;
  tick();
}
function stepNN(){
  if(stepIdx>=numCities){finishAlgo('Nearest Neighbor');return;}
  var last=currentRoute[currentRoute.length-1],nd=Infinity,ni=-1;
  for(var i=0;i<numCities;i++){if(visited[i])continue;var d=cityDist(last,i);if(d<nd){nd=d;ni=i;}}
  currentRoute.push(ni);visited[ni]=true;stepIdx++;
  setStatus('NN: step <span>'+stepIdx+'/'+numCities+'</span>');
}

// ── 2-Opt ──

function start2Opt(){
  if(phase!=='idle'&&phase!=='done')return;
  if(bestRoute.length===numCities)currentRoute=bestRoute.slice();
  else{currentRoute=[];for(var i=0;i<numCities;i++)currentRoute.push(i);for(var i=numCities-1;i>0;i--){var j=Math.floor(rand()*(i+1));var t=currentRoute[i];currentRoute[i]=currentRoute[j];currentRoute[j]=t;}}
  currentDist=routeDist(currentRoute);
  phase='2opt';lastAlgo='2-Opt';opt2_i=0;opt2_j=2;opt2_improved=true;opt2_pass=0;
  tick();
}
function step2Opt(){
  var n=currentRoute.length;
  // Do many comparisons per frame so it finishes in reasonable time
  var perFrame=Math.max(20, Math.floor(n*n/60));

  for(var s=0;s<perFrame;s++){
    // End of pass?
    if(opt2_i>=n-1||(opt2_i===0&&opt2_j<2)){
      if(!opt2_improved||opt2_pass>=20){
        finishAlgo('2-Opt ('+opt2_pass+' passes)');
        return;
      }
      opt2_improved=false;
      opt2_pass++;
      opt2_i=0;opt2_j=2;
    }
    if(opt2_j>=n){opt2_i++;opt2_j=opt2_i+2;continue;}

    var a=currentRoute[opt2_i],b=currentRoute[(opt2_i+1)%n];
    var c=currentRoute[opt2_j],d=currentRoute[(opt2_j+1)%n];
    if(cityDist(a,c)+cityDist(b,d)<cityDist(a,b)+cityDist(c,d)-0.001){
      var l=opt2_i+1,r2=opt2_j;
      while(l<r2){var t=currentRoute[l];currentRoute[l]=currentRoute[r2];currentRoute[r2]=t;l++;r2--;}
      currentDist=routeDist(currentRoute);opt2_improved=true;
    }
    opt2_j++;
    if(opt2_j>=n){opt2_i++;opt2_j=opt2_i+2;}
  }
  setStatus('2-Opt pass <span>'+opt2_pass+'</span> dist=<span>'+Math.round(currentDist)+'</span>');
}

// ── SA ──

function startSA(){
  if(phase!=='idle'&&phase!=='done')return;
  if(bestRoute.length===numCities)currentRoute=bestRoute.slice();
  else{currentRoute=[];for(var i=0;i<numCities;i++)currentRoute.push(i);for(var i=numCities-1;i>0;i--){var j=Math.floor(rand()*(i+1));var t=currentRoute[i];currentRoute[i]=currentRoute[j];currentRoute[j]=t;}}
  currentDist=routeDist(currentRoute);
  phase='sa';lastAlgo='SA';saTemp=currentDist*0.5;saCooling=0.9995;saSteps=0;saTotal=numCities*400;
  tick();
}
function stepSA(){
  for(var s=0;s<3;s++){
    if(saSteps>=saTotal||saTemp<0.1){finishAlgo('SA ('+saSteps+' steps)');return;}
    var i=Math.floor(rand()*numCities),j=Math.floor(rand()*numCities);
    if(i===j){saSteps++;saTemp*=saCooling;continue;}if(i>j){var t=i;i=j;j=t;}
    var n=numCities,a=currentRoute[i],b=currentRoute[(i+1)%n],c=currentRoute[j],d=currentRoute[(j+1)%n];
    var delta=(cityDist(a,c)+cityDist(b,d))-(cityDist(a,b)+cityDist(c,d));
    if(delta<0||rand()<Math.exp(-delta/saTemp)){
      var l=i+1,r2=j;while(l<r2){var t=currentRoute[l];currentRoute[l]=currentRoute[r2];currentRoute[r2]=t;l++;r2--;}
      currentDist=routeDist(currentRoute);
    }
    saTemp*=saCooling;saSteps++;
  }
  setStatus('SA <span>'+saSteps+'/'+saTotal+'</span> T='+saTemp.toFixed(1)+' dist=<span>'+Math.round(currentDist)+'</span>');
}

// ── Draw ────────────────────────────────────────────────────────────────────

function draw(){
  background(COL_BG);

  // Step algorithm
  if(phase==='nn')stepNN();
  else if(phase==='2opt')step2Opt();
  else if(phase==='sa')stepSA();

  // ════════════════════════════════════════════
  // DONE STATE: draw doneRoute (frozen, simple)
  // ════════════════════════════════════════════
  if(phase==='done'&&doneRoute.length>0){
    drawRouteLines(doneRoute,true,COL_ROUTE_DONE,true);
    drawCitiesAll(true);
    drawInfoPanel(doneDist,lastAlgo);
    return; // nothing else needed
  }

  // ════════════════════════════════════════════
  // RUNNING STATE
  // ════════════════════════════════════════════

  // NN candidate lines
  if(phase==='nn'&&currentRoute.length>0&&currentRoute.length<numCities){
    var last=currentRoute[currentRoute.length-1];
    stroke(COL_CANDIDATE);strokeWeight(max(sz*0.002,0.5));
    for(var i=0;i<numCities;i++){if(!visited[i])line(cities[last].x,cities[last].y,cities[i].x,cities[i].y);}
  }

  // Current route
  if(currentRoute.length>1){
    var col=COL_ROUTE_NN;
    if(phase==='2opt')col=COL_ROUTE_2OPT;
    if(phase==='sa')col=COL_ROUTE_SA;
    var close=(phase!=='nn'||currentRoute.length===numCities);
    drawRouteLines(currentRoute,close,col,false);
  }

  // 2-opt swap highlight
  if(phase==='2opt'&&currentRoute.length>0){
    stroke(COL_SWAP_HL);strokeWeight(max(sz*0.003,1));noFill();
    var hs=max(sz*0.025,6);
    var ci2=currentRoute[opt2_i%currentRoute.length];
    var cj2=currentRoute[opt2_j%currentRoute.length];
    ellipse(cities[ci2].x,cities[ci2].y,hs,hs);
    ellipse(cities[cj2].x,cities[cj2].y,hs,hs);
  }

  // Cities
  drawCitiesAll(phase!=='idle');

  // NN head
  if(phase==='nn'&&currentRoute.length>0){
    noFill();stroke(COL_START);strokeWeight(max(sz*0.003,1));
    ellipse(cities[currentRoute[0]].x,cities[currentRoute[0]].y,max(sz*0.022,6),max(sz*0.022,6));
    if(currentRoute.length<numCities){
      fill(COL_START);noStroke();
      var cur=currentRoute[currentRoute.length-1];
      ellipse(cities[cur].x,cities[cur].y,max(sz*0.016,4.5),max(sz*0.016,4.5));
    }
  }

  // IDLE: just cities, no route
}

// ── Drawing helpers ─────────────────────────────────────────────────────────

function drawRouteLines(route,closeLoop,col,showDist){
  strokeCap(ROUND);strokeJoin(ROUND);
  var n=route.length;
  var count=closeLoop?n:n-1;
  for(var i=0;i<count;i++){
    var ci=route[i],cj=route[(i+1)%n];
    var progress=i/n;
    var segCol=showDist?lerpColor(color(col),color(COL_CITY),progress*0.2):color(col);
    stroke(segCol);strokeWeight(max(sz*0.005,1.5));
    line(cities[ci].x,cities[ci].y,cities[cj].x,cities[cj].y);

    if(showDist){
      var mx=(cities[ci].x+cities[cj].x)/2;
      var my=(cities[ci].y+cities[cj].y)/2;
      noStroke();
      fill(red(color(COL_LABEL)),green(color(COL_LABEL)),blue(color(COL_LABEL)),130);
      textAlign(CENTER,CENTER);textSize(max(sz*0.016,7));
      text(Math.round(cityDist(ci,cj)),mx,my);
    }
  }
}

function drawCitiesAll(isActive){
  for(var i=0;i<numCities;i++){
    var isV=(phase==='nn')?visited[i]:isActive;
    noStroke();
    if(isV){
      fill(red(color(COL_CITY_VISITED)),green(color(COL_CITY_VISITED)),blue(color(COL_CITY_VISITED)),25);
      ellipse(cities[i].x,cities[i].y,sz*0.028,sz*0.028);
    }
    fill(isV?COL_CITY_VISITED:COL_CITY);
    var ds=max(sz*0.013,3.5);
    ellipse(cities[i].x,cities[i].y,ds,ds);

    // City label
    noStroke();
    fill(red(color(COL_LABEL)),green(color(COL_LABEL)),blue(color(COL_LABEL)),isActive?180:100);
    textAlign(CENTER,BOTTOM);textSize(max(sz*0.016,7));
    text(i,cities[i].x,cities[i].y-ds-1);
  }
}

function drawInfoPanel(dist,algo){
  noStroke();textAlign(RIGHT,BOTTOM);
  fill(COL_ROUTE_DONE);textSize(max(sz*0.028,11));
  text('Total: '+Math.round(dist),sz-margin,sz-margin*0.3);
  fill(180);textSize(max(sz*0.02,9));
  text(numCities+' cities | '+algo,sz-margin,sz-margin*0.3+max(sz*0.028,13));
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function setStatus(h){var e=document.getElementById('status');if(e)e.innerHTML=h;}

function windowResized(){
  var ctrlH=document.getElementById('controls').offsetHeight||50;
  var statusH=document.getElementById('status').offsetHeight||20;
  sz=Math.min(window.innerWidth,window.innerHeight-ctrlH-statusH-10);
  sz=Math.max(sz,200);margin=sz*0.08;resizeCanvas(sz,sz);
}

function keyPressed(){
  if(key===' ')newCities();
  if(key==='s'||key==='S')saveCanvas('tsp-'+Date.now(),'png');
  if(key==='1')startNN();if(key==='2')start2Opt();if(key==='3')startSA();
}
