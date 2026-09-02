// ============================================
// Round Truchet — 圓形填充式 Truchet
// Quarter-circles at corners form full circles
// and organic round patterns when connected.
// ============================================

const rand = fxrand;

// ── Palettes ────────────────────────────────────────────────────────────────

const PALETTES = [
  { name: "Sailor Moon",  bg: "#1A1F4E", colors: ["#6FA8DC","#F4B8D4","#B4A7D6","#FFFFFF","#2B3A8C","#89B4E8","#E8A0BF"] },
  { name: "Twilight",     bg: "#1A1A2E", colors: ["#7CB9E8","#F2A2C0","#C3A6D8","#E8E8F0","#3B4FA0","#A0D2F0"] },
  { name: "Sunset",       bg: "#2D1B33", colors: ["#FF6B35","#FF8C42","#F9C74F","#E8405F","#FFFFFF","#F77F00"] },
  { name: "Campfire",     bg: "#1C1410", colors: ["#E63946","#F4A261","#E9C46A","#FFFFFF","#D62828","#2A9D8F"] },
  { name: "Ocean",        bg: "#0A1628", colors: ["#0077B6","#00B4D8","#90E0EF","#CAF0F8","#023E8A","#48CAE4"] },
  { name: "Arctic",       bg: "#0D1B2A", colors: ["#A5F3FC","#67E8F9","#22D3EE","#FFFFFF","#0891B2","#06B6D4"] },
  { name: "Mint",         bg: "#0B2027", colors: ["#00B894","#55EFC4","#81ECEC","#FFFFFF","#00CEC9","#6C5CE7"] },
  { name: "Pop Art",      bg: "#1A1A2E", colors: ["#FF006E","#FFBE0B","#3A86FF","#8338EC","#FFFFFF","#FB5607"] },
  { name: "Bauhaus",      bg: "#F5F5F0", colors: ["#BE1E2D","#21409A","#FFDE17","#1A1A1A","#E85D04","#00A878"] },
  { name: "Mondrian",     bg: "#FFFEF5", colors: ["#D40920","#1356A2","#F7D842","#1A1A1A","#FFFFFF","#2E933C"] },
  { name: "Pastel",       bg: "#2C2137", colors: ["#FEC8C1","#A8E6CF","#FFD3B6","#DCEDC1","#FF8B94","#C7CEEA"] },
  { name: "Dreamy",       bg: "#1E1533", colors: ["#F8B4D9","#B8C0FF","#BBD0FF","#FFD6FF","#E7C6FF","#FFFFFF"] },
  { name: "Cotton Candy", bg: "#1C1035", colors: ["#FF9FF3","#FECA57","#54A0FF","#5F27CD","#FF6B81","#C8D6E5"] },
  { name: "Forest",       bg: "#0A1F0A", colors: ["#2D6A4F","#52B788","#95D5B2","#D8F3DC","#1B4332","#74C69D"] },
  { name: "Autumn",       bg: "#1C1008", colors: ["#BC6C25","#DDA15E","#606C38","#FEFAE0","#9B2226","#AE2012"] },
  { name: "Cherry",       bg: "#1A0A10", colors: ["#FFB7C5","#FF1493","#DB7093","#FFFFFF","#C71585","#FF69B4"] },
  { name: "Cyberpunk",    bg: "#0A0A1A", colors: ["#FF2A6D","#05D9E8","#D1F7FF","#7B61FF","#FF6B6B","#01FFC3"] },
  { name: "Neon",         bg: "#0D0221", colors: ["#F72585","#7209B7","#4361EE","#4CC9F0","#3A0CA3","#FFFFFF"] },
  { name: "Matrix",       bg: "#0A0F0A", colors: ["#00FF41","#00CC33","#009926","#33FF66","#66FF8C","#003300"] },
  { name: "Evangelion",   bg: "#1A0A28", colors: ["#4F2A92","#B8E84C","#F58D39","#E52C2C","#F4B943","#FFFFFF"] },
  { name: "Noir Gold",    bg: "#0D0D0D", colors: ["#FFD700","#F4C430","#DAA520","#FFFFFF","#B8860B","#E6BE8A"] },
  { name: "Blue White",   bg: "#1A2744", colors: ["#FFFFFF","#E8E8F0","#A8C4E0","#5B8DB8","#3A6D90","#D0E4F0"] },
];

let pal, gridSize, tiles = [], showGrain, multiColor;

function setup() {
  createCanvas(min(windowWidth, windowHeight), min(windowWidth, windowHeight));
  pal = PALETTES[floor(rand() * PALETTES.length)];
  gridSize = floor(rand() * 5) + 5;
  showGrain = rand() < 0.75;
  multiColor = rand() < 0.8;
  generateTiles();
  window.$fxhashFeatures = { "Palette": pal.name, "Grid": gridSize+"x"+gridSize, "MultiColor": multiColor?"Yes":"No", "Grain": showGrain?"Yes":"No" };
  noLoop();
  setTimeout(() => fxpreview(), 2000);
}

function generateTiles() {
  const usable = pal.colors.filter(c => colorDist(c, pal.bg) > 50);
  tiles = [];
  for (let r = 0; r < gridSize; r++) { tiles[r] = [];
    for (let c = 0; c < gridSize; c++) {
      let c1 = pick(usable), c2 = multiColor ? pick(usable) : c1;
      if (multiColor && usable.length > 1) { let t=0; while(c2===c1&&t<10){c2=pick(usable);t++;} }
      tiles[r][c] = { dir: rand()<0.5?0:1, color1:c1, color2:c2 };
    }
  }
}

function pick(a) { return a[floor(rand()*a.length)]; }
function hexRGB(h) { return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]; }
function colorDist(a,b) { const [r1,g1,b1]=hexRGB(a),[r2,g2,b2]=hexRGB(b); return Math.sqrt((r1-r2)**2+(g1-g2)**2+(b1-b2)**2); }

function draw() {
  background(pal.bg); noStroke();
  const m=width*0.08, gw=width-m*2, cs=gw/gridSize;
  push(); translate(m,m);
  for (let r=0;r<gridSize;r++) for (let c=0;c<gridSize;c++) {
    const x=c*cs, y=r*cs, t=tiles[r][c];
    let cTL,cTR,cBR,cBL;
    if(t.dir===0){cTL=t.color1;cBR=t.color1;cTR=t.color2;cBL=t.color2;}
    else{cTR=t.color1;cBL=t.color1;cTL=t.color2;cBR=t.color2;}
    fill(cTL); arc(x,y,cs,cs,0,HALF_PI);
    fill(cTR); arc(x+cs,y,cs,cs,HALF_PI,PI);
    fill(cBR); arc(x+cs,y+cs,cs,cs,PI,PI+HALF_PI);
    fill(cBL); arc(x,y+cs,cs,cs,PI+HALF_PI,TWO_PI);
  }
  pop();
  if(showGrain){loadPixels();const d=pixelDensity(),t=4*(width*d)*(height*d);for(let i=0;i<t;i+=4){const n=(rand()-0.5)*35;pixels[i]=constrain(pixels[i]+n,0,255);pixels[i+1]=constrain(pixels[i+1]+n,0,255);pixels[i+2]=constrain(pixels[i+2]+n,0,255);}updatePixels();}
}

function windowResized(){resizeCanvas(min(windowWidth,windowHeight),min(windowWidth,windowHeight));redraw();}
function keyPressed(){
  if(key===' '){pal=PALETTES[floor(rand()*PALETTES.length)];gridSize=floor(rand()*5)+5;multiColor=rand()<0.8;showGrain=rand()<0.75;generateTiles();redraw();}
  if(key==='s'||key==='S')saveCanvas(`round-truchet-${fxhash.slice(0,8)}-${Date.now()}`,'png');
}
