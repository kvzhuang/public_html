// ============================================
// Ink Flow 墨流 - Generative Art
// GPU 流體模擬的墨水暈染（Navier-Stokes）
//   速度場平流 → 渦度補強 → 散度 → Jacobi 壓力
//   → 梯度修正 → 墨色平流
// 顯示層：紙紋 + Beer-Lambert 吸墨 + 邊緣沉澱
// 互動：拖曳攪動、點擊滴墨、四色墨盤
// ============================================

'use strict';

const rand = fxrand;
const rr = (a,b)=>a+rand()*(b-a);
const ri = (a,b)=>Math.floor(rr(a,b+1));

// ── 四色墨盤（fxhash 抽選）──
const PALETTES = [
  { name:'墨彩', w:30, paper:[0.949,0.922,0.851],
    inks:[[0.10,0.10,0.13],[0.17,0.37,0.54],[0.75,0.23,0.17],[0.85,0.65,0.13]] }, // 墨、花青、朱砂、藤黃
  { name:'嵐青', w:22, paper:[0.937,0.929,0.886],
    inks:[[0.13,0.19,0.24],[0.24,0.49,0.55],[0.48,0.36,0.62],[0.36,0.60,0.42]] }, // 鐵墨、嵐青、紫藤、松綠
  { name:'茜染', w:22, paper:[0.957,0.929,0.871],
    inks:[[0.16,0.12,0.13],[0.72,0.21,0.35],[0.85,0.48,0.16],[0.29,0.43,0.31]] }, // 焦墨、茜紅、柿橙、青苔
  { name:'胡粉', w:16, paper:[0.918,0.902,0.847],
    inks:[[0.12,0.13,0.17],[0.55,0.57,0.60],[0.62,0.42,0.50],[0.33,0.50,0.59]] }, // 墨、銀鼠、梅鼠、藍鼠
];

function weightedPick(items, weights){
  const total = weights.reduce((a,b)=>a+b,0);
  let r = rand()*total;
  for(let i=0;i<items.length;i++){ r-=weights[i]; if(r<0) return items[i]; }
  return items[items.length-1];
}

const pal = weightedPick(PALETTES, PALETTES.map(p=>p.w));

// ── 模擬參數（部分由 fxhash 決定）──
const config = {
  SIM_RES: 160,
  DYE_RES: 1024,
  PRESSURE_ITER: 22,
  CURL: rr(18, 38),                 // 渦旋強度
  DYE_DISS: 0.9988,                 // 墨色殘留（接近 1 → 墨痕持久）
  VEL_DISS: rr(0.988, 0.995),       // 流速衰減
  SPLAT_RADIUS: 0.008,
  SPLAT_FORCE: 5200,
  AUTO_DROP_MIN: rr(0.7, 1.1),      // 自動滴墨間隔（秒）
  AUTO_DROP_MAX: rr(1.8, 2.8),
};

window.$fxhashFeatures = {
  '墨盤': pal.name,
  '渦旋': config.CURL > 30 ? '強' : config.CURL > 24 ? '中' : '柔',
  '滴墨節奏': config.AUTO_DROP_MAX < 2.2 ? '急' : '緩',
};
console.log('fxhash:', fxhash);
console.log('features:', window.$fxhashFeatures);

// ── WebGL 初始化 ──
const canvas = document.getElementById('c');
const params = { alpha:false, depth:false, stencil:false, antialias:false, preserveDrawingBuffer:true };
let gl = canvas.getContext('webgl2', params);
const isGL2 = !!gl;
if(!gl) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
if(!gl){ document.getElementById('hint').textContent = '此裝置不支援 WebGL'; throw new Error('no webgl'); }

let halfFloat, supportLinearFiltering;
if(isGL2){
  gl.getExtension('EXT_color_buffer_float');
  supportLinearFiltering = !!gl.getExtension('OES_texture_float_linear') || !!gl.getExtension('OES_texture_half_float_linear');
} else {
  halfFloat = gl.getExtension('OES_texture_half_float');
  supportLinearFiltering = !!gl.getExtension('OES_texture_half_float_linear');
}
const halfFloatTexType = isGL2 ? gl.HALF_FLOAT : (halfFloat ? halfFloat.HALF_FLOAT_OES : gl.UNSIGNED_BYTE);

function getSupportedFormat(internalFormat, format, type){
  if(!supportRenderTextureFormat(internalFormat, format, type)){
    if(isGL2){
      switch(internalFormat){
        case gl.R16F:  return getSupportedFormat(gl.RG16F, gl.RG, type);
        case gl.RG16F: return getSupportedFormat(gl.RGBA16F, gl.RGBA, type);
        default: return null;
      }
    }
    return null;
  }
  return { internalFormat, format };
}
function supportRenderTextureFormat(internalFormat, format, type){
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
}

const formatRGBA = isGL2
  ? getSupportedFormat(gl.RGBA16F, gl.RGBA, halfFloatTexType)
  : getSupportedFormat(gl.RGBA, gl.RGBA, halfFloatTexType);
const formatRG = isGL2
  ? getSupportedFormat(gl.RG16F, gl.RG, halfFloatTexType)
  : formatRGBA;
const formatR = isGL2
  ? getSupportedFormat(gl.R16F, gl.RED, halfFloatTexType)
  : formatRGBA;

// ── Shader 工具 ──
function compileShader(type, source, keywords){
  let src = '';
  if(keywords) keywords.forEach(k=>{ src += '#define '+k+'\n'; });
  src += source;
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
    throw new Error('shader: ' + gl.getShaderInfoLog(shader));
  }
  return shader;
}
function createProgram(vs, fs){
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, 'aPosition');   // 固定 attribute 位置
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
    throw new Error('link: ' + gl.getProgramInfoLog(program));
  }
  const uniforms = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for(let i=0;i<count;i++){
    const name = gl.getActiveUniform(program, i).name;
    uniforms[name] = gl.getUniformLocation(program, name);
  }
  return { program, uniforms, bind(){ gl.useProgram(program); } };
}

const baseVS = compileShader(gl.VERTEX_SHADER, `
  precision highp float;
  attribute vec2 aPosition;
  varying vec2 vUv;
  varying vec2 vL, vR, vT, vB;
  uniform vec2 texelSize;
  void main(){
    vUv = aPosition * 0.5 + 0.5;
    vL = vUv - vec2(texelSize.x, 0.0);
    vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y);
    vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`);

const copyFS = compileShader(gl.FRAGMENT_SHADER, `
  precision mediump float; precision mediump sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  void main(){ gl_FragColor = texture2D(uTexture, vUv); }
`);

const clearFS = compileShader(gl.FRAGMENT_SHADER, `
  precision mediump float; precision mediump sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float value;
  void main(){ gl_FragColor = value * texture2D(uTexture, vUv); }
`);

const splatFS = compileShader(gl.FRAGMENT_SHADER, `
  precision highp float; precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform float aspectRatio;
  uniform vec3 color;
  uniform vec2 point;
  uniform float radius;
  void main(){
    vec2 p = vUv - point.xy;
    p.x *= aspectRatio;
    vec3 splat = exp(-dot(p, p) / radius) * color;
    vec3 base = texture2D(uTarget, vUv).xyz;
    gl_FragColor = vec4(base + splat, 1.0);
  }
`);

const advectionFS = compileShader(gl.FRAGMENT_SHADER, `
  precision highp float; precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 texelSize;
  uniform vec2 dyeTexelSize;
  uniform float dt;
  uniform float dissipation;
  vec4 bilerp(sampler2D sam, vec2 uv, vec2 tsize){
    vec2 st = uv / tsize - 0.5;
    vec2 iuv = floor(st);
    vec2 fuv = fract(st);
    vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
    vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
    vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
    vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
    return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
  }
  void main(){
  #ifdef MANUAL_FILTERING
    vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
    vec4 result = bilerp(uSource, coord, dyeTexelSize);
  #else
    vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
    vec4 result = texture2D(uSource, coord);
  #endif
    gl_FragColor = dissipation * result;
  }
`, supportLinearFiltering ? null : ['MANUAL_FILTERING']);

const divergenceFS = compileShader(gl.FRAGMENT_SHADER, `
  precision mediump float; precision mediump sampler2D;
  varying vec2 vUv, vL, vR, vT, vB;
  uniform sampler2D uVelocity;
  void main(){
    float L = texture2D(uVelocity, vL).x;
    float R = texture2D(uVelocity, vR).x;
    float T = texture2D(uVelocity, vT).y;
    float B = texture2D(uVelocity, vB).y;
    vec2 C = texture2D(uVelocity, vUv).xy;
    if(vL.x < 0.0){ L = -C.x; }
    if(vR.x > 1.0){ R = -C.x; }
    if(vT.y > 1.0){ T = -C.y; }
    if(vB.y < 0.0){ B = -C.y; }
    float div = 0.5 * (R - L + T - B);
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
  }
`);

const curlFS = compileShader(gl.FRAGMENT_SHADER, `
  precision mediump float; precision mediump sampler2D;
  varying vec2 vUv, vL, vR, vT, vB;
  uniform sampler2D uVelocity;
  void main(){
    float L = texture2D(uVelocity, vL).y;
    float R = texture2D(uVelocity, vR).y;
    float T = texture2D(uVelocity, vT).x;
    float B = texture2D(uVelocity, vB).x;
    float vorticity = R - L - T + B;
    gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
  }
`);

const vorticityFS = compileShader(gl.FRAGMENT_SHADER, `
  precision highp float; precision highp sampler2D;
  varying vec2 vUv, vL, vR, vT, vB;
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform float curl;
  uniform float dt;
  void main(){
    float L = texture2D(uCurl, vL).x;
    float R = texture2D(uCurl, vR).x;
    float T = texture2D(uCurl, vT).x;
    float B = texture2D(uCurl, vB).x;
    float C = texture2D(uCurl, vUv).x;
    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 0.0001;
    force *= curl * C;
    force.y *= -1.0;
    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity += force * dt;
    velocity = min(max(velocity, -1000.0), 1000.0);
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`);

const pressureFS = compileShader(gl.FRAGMENT_SHADER, `
  precision mediump float; precision mediump sampler2D;
  varying vec2 vUv, vL, vR, vT, vB;
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  void main(){
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    float divergence = texture2D(uDivergence, vUv).x;
    float pressure = (L + R + B + T - divergence) * 0.25;
    gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
  }
`);

const gradientSubtractFS = compileShader(gl.FRAGMENT_SHADER, `
  precision mediump float; precision mediump sampler2D;
  varying vec2 vUv, vL, vR, vT, vB;
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;
  void main(){
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity.xy -= vec2(R - L, T - B);
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`);

// 顯示：紙紋 + Beer-Lambert 吸墨 + 邊緣沉澱（水痕）
const displayFS = compileShader(gl.FRAGMENT_SHADER, `
  precision highp float; precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uDye;
  uniform vec2 texelSize;
  uniform vec3 paper;
  uniform vec2 resolution;
  float hash(vec2 p){
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise2(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
  }
  void main(){
    vec3 dye = texture2D(uDye, vUv).rgb;
    // 紙張顆粒 + 纖維
    float grain = hash(vUv * resolution) * 0.05;
    float fiber = noise2(vUv * vec2(240.0, 14.0)) * 0.03;
    float blotch = noise2(vUv * 9.0) * 0.04;
    vec3 paperCol = paper * (1.0 - grain - fiber - blotch + 0.06);
    // 顏料沉澱顆粒（墨深處更明顯）
    float density = dot(dye, vec3(0.333));
    float granul = (hash(vUv * resolution * 0.5) - 0.5) * min(density, 1.0) * 0.12;
    vec3 ink = dye * (1.0 + granul);
    // Beer-Lambert 吸收：墨愈濃紙色愈被吃掉
    vec3 col = paperCol * exp(-ink * 2.1);
    // 邊緣沉澱（水痕）：墨色梯度愈大愈深
    float dl = dot(texture2D(uDye, vUv - vec2(texelSize.x, 0.0)).rgb, vec3(0.333));
    float dr = dot(texture2D(uDye, vUv + vec2(texelSize.x, 0.0)).rgb, vec3(0.333));
    float db = dot(texture2D(uDye, vUv - vec2(0.0, texelSize.y)).rgb, vec3(0.333));
    float dt2 = dot(texture2D(uDye, vUv + vec2(0.0, texelSize.y)).rgb, vec3(0.333));
    float edge = length(vec2(dr - dl, dt2 - db));
    col *= 1.0 - min(edge * 1.8, 0.32);
    // 四周輕微暗角
    vec2 d = vUv - 0.5;
    col *= 1.0 - dot(d, d) * 0.18;
    gl_FragColor = vec4(col, 1.0);
  }
`);

// ── 全螢幕繪製 ──
const blit = (()=>{
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, -1,3, 3,-1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  return (target)=>{
    if(target==null){
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
      gl.viewport(0, 0, target.width, target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
})();

// ── FBO ──
function createFBO(w, h, internalFormat, format, type, filterParam){
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filterParam);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filterParam);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.clearColor(0,0,0,1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  return {
    texture, fbo, width:w, height:h,
    texelSizeX: 1/w, texelSizeY: 1/h,
    attach(id){
      gl.activeTexture(gl.TEXTURE0 + id);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      return id;
    },
  };
}
function createDoubleFBO(w, h, internalFormat, format, type, filterParam){
  let fbo1 = createFBO(w, h, internalFormat, format, type, filterParam);
  let fbo2 = createFBO(w, h, internalFormat, format, type, filterParam);
  return {
    width:w, height:h,
    texelSizeX: 1/w, texelSizeY: 1/h,
    get read(){ return fbo1; },
    get write(){ return fbo2; },
    swap(){ const t = fbo1; fbo1 = fbo2; fbo2 = t; },
  };
}

// ── 程式 ──
const copyProgram      = createProgram(baseVS, copyFS);
const clearProgram     = createProgram(baseVS, clearFS);
const splatProgram     = createProgram(baseVS, splatFS);
const advectionProgram = createProgram(baseVS, advectionFS);
const divergenceProgram= createProgram(baseVS, divergenceFS);
const curlProgram      = createProgram(baseVS, curlFS);
const vorticityProgram = createProgram(baseVS, vorticityFS);
const pressureProgram  = createProgram(baseVS, pressureFS);
const gradSubProgram   = createProgram(baseVS, gradientSubtractFS);
const displayProgram   = createProgram(baseVS, displayFS);

// ── 解析度與 FBO ──
let dye, velocity, divergence, curl, pressure;

function getResolution(resolution){
  let aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
  if(aspect < 1) aspect = 1/aspect;
  const min = Math.round(resolution);
  const max = Math.round(resolution * aspect);
  if(gl.drawingBufferWidth > gl.drawingBufferHeight) return { width:max, height:min };
  return { width:min, height:max };
}

function initFramebuffers(){
  const simRes = getResolution(config.SIM_RES);
  const dyeRes = getResolution(config.DYE_RES);
  const texType = halfFloatTexType;
  const filtering = supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
  dye        = createDoubleFBO(dyeRes.width, dyeRes.height, formatRGBA.internalFormat, formatRGBA.format, texType, filtering);
  velocity   = createDoubleFBO(simRes.width, simRes.height, formatRG.internalFormat, formatRG.format, texType, filtering);
  divergence = createFBO(simRes.width, simRes.height, formatR.internalFormat, formatR.format, texType, gl.NEAREST);
  curl       = createFBO(simRes.width, simRes.height, formatR.internalFormat, formatR.format, texType, gl.NEAREST);
  pressure   = createDoubleFBO(simRes.width, simRes.height, formatR.internalFormat, formatR.format, texType, gl.NEAREST);
}

function resizeCanvas(){
  const dpr = Math.min(window.devicePixelRatio||1, 2);
  const w = Math.floor(canvas.clientWidth * dpr);
  const h = Math.floor(canvas.clientHeight * dpr);
  if(canvas.width !== w || canvas.height !== h){
    canvas.width = w; canvas.height = h;
    return true;
  }
  return false;
}
resizeCanvas();
initFramebuffers();

// ── 模擬步驟 ──
function step(dt){
  gl.disable(gl.BLEND);

  // 渦度補強（讓墨自然捲旋）
  curlProgram.bind();
  gl.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
  blit(curl);

  vorticityProgram.bind();
  gl.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
  gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
  gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
  gl.uniform1f(vorticityProgram.uniforms.dt, dt);
  blit(velocity.write);
  velocity.swap();

  // 散度 → 壓力 → 修正
  divergenceProgram.bind();
  gl.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
  blit(divergence);

  clearProgram.bind();
  gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
  gl.uniform1f(clearProgram.uniforms.value, 0.8);
  blit(pressure.write);
  pressure.swap();

  pressureProgram.bind();
  gl.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
  for(let i=0;i<config.PRESSURE_ITER;i++){
    gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
    blit(pressure.write);
    pressure.swap();
  }

  gradSubProgram.bind();
  gl.uniform2f(gradSubProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1i(gradSubProgram.uniforms.uPressure, pressure.read.attach(0));
  gl.uniform1i(gradSubProgram.uniforms.uVelocity, velocity.read.attach(1));
  blit(velocity.write);
  velocity.swap();

  // 平流
  advectionProgram.bind();
  gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
  if(!supportLinearFiltering)
    gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
  const velocityId = velocity.read.attach(0);
  gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId);
  gl.uniform1i(advectionProgram.uniforms.uSource, velocityId);
  gl.uniform1f(advectionProgram.uniforms.dt, dt);
  gl.uniform1f(advectionProgram.uniforms.dissipation, config.VEL_DISS);
  blit(velocity.write);
  velocity.swap();

  if(!supportLinearFiltering)
    gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
  gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
  gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
  gl.uniform1f(advectionProgram.uniforms.dissipation, config.DYE_DISS);
  blit(dye.write);
  dye.swap();
}

function render(){
  displayProgram.bind();
  gl.uniform1i(displayProgram.uniforms.uDye, dye.read.attach(0));
  gl.uniform2f(displayProgram.uniforms.texelSize, dye.texelSizeX, dye.texelSizeY);
  gl.uniform3f(displayProgram.uniforms.paper, pal.paper[0], pal.paper[1], pal.paper[2]);
  gl.uniform2f(displayProgram.uniforms.resolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
  blit(null);
}

// ── 墨滴與攪動 ──
function splat(x, y, dx, dy, color, radiusMul=1){
  splatProgram.bind();
  gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
  gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width/canvas.height);
  gl.uniform2f(splatProgram.uniforms.point, x, y);
  gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0);
  gl.uniform1f(splatProgram.uniforms.radius, config.SPLAT_RADIUS * radiusMul / 100);
  blit(velocity.write);
  velocity.swap();

  gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
  gl.uniform3f(splatProgram.uniforms.color, color[0], color[1], color[2]);
  blit(dye.write);
  dye.swap();
}

function dropInk(x, y, color, big){
  // 一滴墨：中心濃 + 外圈淡 + 微亂流
  const scale = big ? rr(1.6,2.6) : rr(0.8,1.4);
  splat(x, y, rr(-60,60), rr(-60,60), color.map(c=>c*0.9), 3.2*scale);
  splat(x, y, 0, 0, color.map(c=>c*0.35), 8*scale);
  const nJet = ri(3,5);
  for(let i=0;i<nJet;i++){
    const a = rand()*Math.PI*2;
    splat(x + Math.cos(a)*0.004*scale, y + Math.sin(a)*0.004*scale,
      Math.cos(a)*rr(120,320)*scale, Math.sin(a)*rr(120,320)*scale,
      color.map(c=>c*0.22), 1.4*scale);
  }
}

function clearInk(){
  clearProgram.bind();
  gl.uniform1i(clearProgram.uniforms.uTexture, dye.read.attach(0));
  gl.uniform1f(clearProgram.uniforms.value, 0);
  blit(dye.write);
  dye.swap();
}

// ── 互動 ──
let currentColor = 0;
const pointers = new Map();

function setSwatches(){
  const box = document.getElementById('palette');
  box.innerHTML = '';
  pal.inks.forEach((ink,i)=>{
    const d = document.createElement('div');
    d.className = 'swatch' + (i===currentColor?' active':'');
    d.style.background = `rgb(${Math.round(ink[0]*255)},${Math.round(ink[1]*255)},${Math.round(ink[2]*255)})`;
    box.appendChild(d);
  });
}
setSwatches();

function pointerPos(e){
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / rect.width,
    y: 1 - (e.clientY - rect.top) / rect.height,
  };
}

canvas.addEventListener('pointerdown', e=>{
  const p = pointerPos(e);
  pointers.set(e.pointerId, { ...p, moved:false });
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e=>{
  const pt = pointers.get(e.pointerId);
  if(!pt) return;
  const p = pointerPos(e);
  const dx = p.x - pt.x, dy = p.y - pt.y;
  if(Math.abs(dx)+Math.abs(dy) > 0.0005){
    pt.moved = true;
    // 拖曳：注入速度 + 淡墨尾跡
    splat(p.x, p.y, dx*config.SPLAT_FORCE, dy*config.SPLAT_FORCE,
      pal.inks[currentColor].map(c=>c*0.18), 1.6);
  }
  pt.x = p.x; pt.y = p.y;
});
function pointerUp(e){
  const pt = pointers.get(e.pointerId);
  if(pt && !pt.moved){
    // 點擊（沒拖動）：滴一大滴墨
    dropInk(pt.x, pt.y, pal.inks[currentColor], true);
    currentColor = (currentColor+1) % 4;
    setSwatches();
  }
  pointers.delete(e.pointerId);
}
canvas.addEventListener('pointerup', pointerUp);
canvas.addEventListener('pointercancel', pointerUp);

let autoDrop = true;
window.addEventListener('keydown', e=>{
  if(e.key>='1' && e.key<='4'){
    currentColor = parseInt(e.key)-1;
    setSwatches();
  } else if(e.key==='a' || e.key==='A'){
    autoDrop = !autoDrop;
  } else if(e.key==='c' || e.key==='C'){
    clearInk();
  } else if(e.key==='s' || e.key==='S'){
    render();
    const a = document.createElement('a');
    a.download = `ink-flow-${fxhash.slice(2,10)}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  } else if(e.key==='r' || e.key==='R'){
    location.reload();
  }
});

window.addEventListener('resize', ()=>{
  if(resizeCanvas()) initFramebuffers();
});

// ── 主迴圈 ──
let lastTime = performance.now();
let dropTimer = 0.4;
let previewSent = false;
let elapsed = 0;

// 開場：灑幾滴墨
for(let i=0;i<ri(4,6);i++){
  dropInk(rr(0.2,0.8), rr(0.25,0.75), pal.inks[i%4], rand()<0.4);
}

function frame(now){
  requestAnimationFrame(frame);
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  dt = Math.min(dt, 0.0166);
  elapsed += dt;

  // 自動滴墨
  if(autoDrop){
    dropTimer -= dt;
    if(dropTimer <= 0){
      dropTimer = rr(config.AUTO_DROP_MIN, config.AUTO_DROP_MAX);
      dropInk(rr(0.08,0.92), rr(0.08,0.92), pal.inks[ri(0,3)], rand()<0.3);
    }
  }

  step(dt);
  render();

  if(!previewSent && elapsed > 3){
    previewSent = true;
    fxpreview();
  }
}
requestAnimationFrame(frame);
