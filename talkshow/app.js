'use strict';
let CAT = null, BYART = {}, BYALB = {};
let queue = [], qi = -1, shuffle = false, repeat = 'list'; // repeat: off|list|one
const audio = document.getElementById('audio');
const $ = id => document.getElementById(id);

function fmt(s){ s=Math.max(0,Math.floor(s||0)); const m=Math.floor(s/60), x=s%60; return m+':'+String(x).padStart(2,'0'); }

fetch('data/catalog.json?v='+Date.now()).then(r=>r.json()).then(init)
  .catch(()=>{ $('sub').textContent='載入失敗'; });

function init(d){
  CAT = d;
  d.tracks.forEach(t=>{
    (BYART[t.artist] = BYART[t.artist]||[]).push(t);
    (BYALB[t.album] = BYALB[t.album]||[]).push(t);
  });
  for(const k in BYALB) BYALB[k].sort((a,b)=>a.track-b.track || a.id-b.id);
  $('sub').textContent = `${d.count} 段 · ${d.artists.length} 位作家 · ${d.albums.length} 部作品`;
  renderBrowse('artist');
}

// ── 瀏覽 ──
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));
  t.classList.add('on');
  renderBrowse(t.dataset.view);
});

function albumsOf(artist){
  const s = {};
  BYART[artist].forEach(t=> s[t.album]=(s[t.album]||0)+1 );
  return Object.keys(s).sort().map(a=>({album:a, n:s[a]}));
}

function renderBrowse(view){
  const box = $('browse');
  if(view==='artist'){
    $('browseTitle').textContent='作家';
    box.className=''; box.innerHTML='';
    const card=document.createElement('div'); card.className='card';
    CAT.artists.forEach(ar=>{
      const row=document.createElement('div'); row.className='art';
      row.innerHTML=`<span>🎤</span><span class="nm">${esc(ar)}</span><span class="ct">${BYART[ar].length} 段</span>`;
      const albs=document.createElement('div'); albs.className='albs'; albs.style.display='none';
      albumsOf(ar).forEach(a=>{
        const al=document.createElement('div'); al.className='alb';
        al.innerHTML=`<span>💿</span><span class="ab">${esc(a.album)}</span><span class="ct">${a.n} 段</span>`;
        al.onclick=e=>{ e.stopPropagation(); loadAlbum(a.album); };
        albs.appendChild(al);
      });
      row.onclick=()=>{ albs.style.display = albs.style.display==='none'?'block':'none'; };
      card.appendChild(row); card.appendChild(albs);
    });
    box.appendChild(card);
  } else {
    $('browseTitle').textContent='作品';
    box.className='grid'; box.innerHTML='';
    CAT.albums.forEach(ab=>{
      const list=BYALB[ab]; const ar=list[0].artist;
      const c=document.createElement('div'); c.className='acard';
      c.innerHTML=`<div class="disc">💿</div><div class="ab">${esc(ab)}</div>`+
        `<div class="meta">🎤 ${esc(ar)}<br>${list.length} 段</div>`;
      c.onclick=()=>loadAlbum(ab);
      box.appendChild(c);
    });
  }
}

// ── 播放清單 ──
function loadAlbum(album, autoplay=true){
  const list = BYALB[album].slice();
  $('plTitle').textContent = album;
  $('plSub').textContent = `${list[0].artist} · ${list.length} 段`;
  renderPlaylist(list);
  if(autoplay){ setQueue(list, 0); }
}

function renderPlaylist(list){
  const box=$('playlist'); box.innerHTML='';
  if(!list.length){ box.innerHTML='<div class="empty">（空）</div>'; return; }
  list.forEach((t,i)=>{
    const r=document.createElement('div'); r.className='tr'; r.dataset.id=t.id;
    r.innerHTML=`<span class="no">${i+1}</span><span class="tt">${esc(t.title)}</span>`+
      `<span class="du">${t.dur?fmt(t.dur):''}</span>`;
    r.onclick=()=>{ setQueue(list, i); };
    box.appendChild(r);
  });
  markPlaying();
}

function markPlaying(){
  document.querySelectorAll('.tr').forEach(r=>{
    r.classList.toggle('playing', queue[qi] && String(queue[qi].id)===r.dataset.id);
  });
}

// ── 播放核心 ──
function setQueue(list, i){ queue=list.slice(); qi=i; playCurrent(); }
function playCurrent(){
  const t=queue[qi]; if(!t) return;
  audio.src='stream.php?id='+t.id;
  audio.play().catch(()=>{});
  $('npTitle').textContent=t.title;
  $('npArtist').textContent=`${t.artist} · ${t.album}`;
  document.title=`▶ ${t.title} — 相聲電台`;
  markPlaying();
}
function next(){
  if(!queue.length) return;
  if(repeat==='one'){ playCurrent(); return; }
  if(shuffle){ qi=Math.floor(Math.random()*queue.length); }
  else if(qi+1<queue.length){ qi++; }
  else if(repeat==='list'){ qi=0; }
  else { return; }
  playCurrent();
}
function prev(){
  if(!queue.length) return;
  if(audio.currentTime>3){ audio.currentTime=0; return; }
  qi=(qi-1+queue.length)%queue.length; playCurrent();
}

$('play').onclick=()=>{ if(!queue.length){ randomAll(); return; } audio.paused?audio.play():audio.pause(); };
$('next').onclick=next;
$('prev').onclick=prev;
audio.onended=next;
audio.onplay=()=>{ $('play').textContent='⏸'; };
audio.onpause=()=>{ $('play').textContent='▶'; };
audio.ontimeupdate=()=>{
  $('cur').textContent=fmt(audio.currentTime);
  const d=audio.duration||queue[qi]?.dur||0;
  $('dur').textContent=fmt(d);
  $('fill').style.width=(d?audio.currentTime/d*100:0)+'%';
};
$('seek').onclick=e=>{
  const r=$('seek').getBoundingClientRect();
  const d=audio.duration||0; if(d) audio.currentTime=(e.clientX-r.left)/r.width*d;
};
$('shuffle').onclick=()=>{ shuffle=!shuffle; $('shuffle').classList.toggle('on',shuffle); };
$('repeat').onclick=()=>{
  repeat = repeat==='list'?'one':(repeat==='one'?'off':'list');
  const b=$('repeat'); b.textContent = repeat==='one'?'🔂':'🔁';
  b.classList.toggle('on', repeat!=='off'); b.title='循環：'+repeat;
};

// ── 電台：隨機全站 / 隨機一部作品 ──
function shuffleArr(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function randomAll(){
  const q=shuffleArr(CAT.tracks); shuffle=true; $('shuffle').classList.add('on');
  $('plTitle').textContent='🎲 隨機電台'; $('plSub').textContent=`全站 ${q.length} 段連續播`;
  renderPlaylist(q); setQueue(q,0);
}
$('randomAll').onclick=randomAll;
$('shuffleArtist').onclick=()=>{
  const ab=CAT.albums[Math.floor(Math.random()*CAT.albums.length)];
  loadAlbum(ab);
};

function esc(s){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

// ── 即時聽眾（一起聽）──
const CID = (()=>{ let c=localStorage.getItem('ts_cid');
  if(!c){ c=Math.random().toString(36).slice(2)+Date.now().toString(36); localStorage.setItem('ts_cid',c);} return c; })();
function showListeners(n){
  const el=$('listeners');
  if(n>=2){ el.innerHTML=`<span class="dot"></span>🎧 ${n} 人正在一起聽`; el.style.display=''; }
  else { el.style.display='none'; }   // 0–1 人不呈現數字
}
function ping(){
  const playing = (!audio.paused && audio.src) ? 1 : 0;
  fetch(`presence.php?id=${CID}&playing=${playing}`, {cache:'no-store'})
    .then(r=>r.json()).then(d=>showListeners(d.count||0)).catch(()=>{});
}
audio.addEventListener('play', ping);
audio.addEventListener('pause', ping);
setInterval(ping, 15000);
ping();
