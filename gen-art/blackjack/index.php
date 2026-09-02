<?php $title = "21點 · Blackjack"; ?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title><?= $title ?></title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+TC:wght@400;500;700&display=swap">
<script src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.2/anime.min.js"></script>
<style>
:root {
  color-scheme: dark;
  --felt: #176247;
  --felt-dark: #0d352a;
  --rail: #3f2b20;
  --gold: #f2b84b;
  --ink: #eef8f3;
  --muted: #9fb9ae;
  --panel: rgba(8,18,18,.76);
  --danger: #ff6b6b;
  --ok: #67e8a1;
  --font: 'Inter','Noto Sans TC',sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
body{
  font-family:var(--font);
  background:radial-gradient(ellipse at 50% 30%,#0b2a1f 0%,#060e0b 100%);
  color:var(--ink);
  height:100dvh;
  display:flex;
  flex-direction:column;
  overflow:hidden;
}

/* ── Topbar ── */
.topbar{
  display:flex;align-items:center;gap:10px;
  padding:9px 16px;
  background:rgba(0,0,0,.45);
  border-bottom:1px solid rgba(255,255,255,.08);
  flex-shrink:0;z-index:10;
}
.topbar-title{font-size:.95rem;font-weight:700;color:var(--gold);letter-spacing:.04em}
.topbar-sub{font-size:.72rem;color:var(--muted)}
.topbar-spacer{flex:1}
.hand-badge{font-size:.68rem;color:var(--muted);background:rgba(255,255,255,.07);padding:3px 9px;border-radius:99px}
.rules-btn{font-size:.68rem;color:var(--muted);background:rgba(255,255,255,.07);border:none;padding:3px 9px;border-radius:99px;cursor:pointer;font-family:var(--font)}
.rules-btn:hover{color:var(--ink)}

/* ── Layout ── */
.app{
  flex:1;
  display:grid;
  grid-template-columns:1fr 210px;
  grid-template-rows:1fr auto;
  overflow:hidden;
  min-height:0;
}
@media(max-width:820px){
  .app{grid-template-columns:1fr;grid-template-rows:1fr auto}
  .log-panel{display:none}
}

/* ── Table area ── */
.table-wrap{
  grid-column:1;grid-row:1;
  display:flex;flex-direction:column;
  padding:12px 14px 8px;
  gap:8px;
  overflow:hidden;
  background:
    radial-gradient(ellipse at 50% 10%,rgba(23,98,71,.35) 0%,transparent 65%),
    radial-gradient(ellipse at 50% 90%,rgba(23,98,71,.2) 0%,transparent 60%);
}

/* ── Dealer zone ── */
.dealer-zone{
  display:flex;flex-direction:column;align-items:center;gap:6px;
  padding:10px 14px;
  background:rgba(0,0,0,.28);
  border-radius:14px;
  border:1px solid rgba(255,255,255,.07);
  flex-shrink:0;
}
.dealer-label{font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.1em}
.dealer-score{font-size:.8rem;color:var(--gold);font-weight:600;min-height:16px}

/* ── Message ── */
.msg-bar{
  text-align:center;font-size:.82rem;color:var(--gold);font-weight:500;
  min-height:18px;flex-shrink:0;padding:2px 0;
}

/* ── Players row ── */
.players-row{
  display:flex;gap:8px;justify-content:center;align-items:flex-end;
  flex:1;min-height:0;overflow:hidden;
  padding-bottom:4px;
}
@media(max-width:820px){
  .players-row{
    flex-wrap:wrap;align-content:flex-start;
    align-items:stretch;overflow-y:auto;
  }
  .seat{min-width:calc(50% - 4px);max-width:calc(50% - 4px);flex:none}
  .seat-avatar{width:28px;height:28px;font-size:.75rem}
  .cards{min-height:46px}
  .card{width:30px;height:44px}
  .card-rank{font-size:.68rem}
  .card-suit{font-size:.6rem}
}

/* ── Seat ── */
.seat{
  display:flex;flex-direction:column;align-items:center;gap:5px;
  padding:10px 10px 8px;
  background:rgba(0,0,0,.32);
  border-radius:13px;
  border:1.5px solid rgba(255,255,255,.09);
  min-width:96px;max-width:130px;flex:1;
  position:relative;
  transition:border-color .3s,box-shadow .3s;
}
.seat.active{border-color:var(--gold);box-shadow:0 0 18px rgba(242,184,75,.28)}
.seat.bust{opacity:.55;border-color:rgba(255,107,107,.4)}
.seat.winner{border-color:var(--ok);box-shadow:0 0 18px rgba(103,232,161,.28)}
.seat.is-human{border-color:rgba(255,255,255,.18)}

.seat-avatar{
  width:34px;height:34px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-size:.85rem;font-weight:700;
  flex-shrink:0;
  border:2px solid rgba(255,255,255,.12);
}
.seat-name{font-size:.72rem;font-weight:600;color:var(--ink);white-space:nowrap}
.personality{font-size:.58rem;color:var(--muted);background:rgba(255,255,255,.07);padding:1px 5px;border-radius:99px}
.seat-score{font-size:.78rem;font-weight:600;color:var(--ink);min-height:15px}
.seat-status{font-size:.68rem;min-height:13px}
.seat-status.bust{color:var(--danger)}
.seat-status.blackjack{color:var(--gold);font-weight:700}
.seat-status.win{color:var(--ok)}
.seat-status.lose{color:var(--danger)}
.seat-status.push{color:var(--muted)}
.seat-bet{font-size:.68rem;color:var(--gold);font-weight:600;min-height:13px}
.seat-stack{font-size:.62rem;color:var(--muted)}

.payout-tag{
  position:absolute;top:5px;right:5px;
  font-size:.6rem;font-weight:700;padding:2px 5px;border-radius:5px;
}
.payout-tag.win{background:var(--ok);color:#072a14}
.payout-tag.lose{background:var(--danger);color:#fff}
.payout-tag.push{background:var(--muted);color:#0a2a1a}
.payout-tag.blackjack{background:var(--gold);color:#1a1200}

.table-talk{
  position:absolute;top:-34px;left:50%;transform:translateX(-50%);
  background:rgba(5,18,15,.9);
  border:1px solid rgba(255,255,255,.15);border-radius:8px;
  padding:3px 8px;font-size:.62rem;color:var(--ink);
  white-space:nowrap;max-width:150px;overflow:hidden;text-overflow:ellipsis;
  pointer-events:none;z-index:5;
  animation:talkIn .2s ease;
}
@keyframes talkIn{from{opacity:0;transform:translateX(-50%) translateY(4px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

/* ── Cards ── */
.cards{
  display:flex;flex-wrap:wrap;justify-content:center;
  min-height:58px;position:relative;
}
.card{
  width:36px;height:52px;border-radius:5px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  border:1px solid rgba(0,0,0,.2);
  position:relative;flex-shrink:0;
  margin-left:-7px;box-shadow:1px 2px 7px rgba(0,0,0,.45);
}
.card:first-child{margin-left:0}
.card.face-up{background:#fff;color:#1a1a1a}
.card.face-up.red{color:#d7263d}
.card.face-down{
  background:linear-gradient(135deg,#1a3a8f 25%,#122a6a 100%);
  border-color:rgba(255,255,255,.2);
}
.card.face-down::after{
  content:'';position:absolute;inset:3px;
  border:1px solid rgba(255,255,255,.15);border-radius:3px;
  background:repeating-linear-gradient(45deg,rgba(255,255,255,.05) 0,rgba(255,255,255,.05) 2px,transparent 2px,transparent 8px);
}
.card-rank{font-size:.78rem;font-weight:700;line-height:1}
.card-suit{font-size:.7rem;line-height:1}
.card.new{opacity:0}

/* ── Controls ── */
.controls{
  grid-column:1;grid-row:2;
  padding:10px 14px 12px;
  background:rgba(0,0,0,.55);
  border-top:1px solid rgba(255,255,255,.07);
  display:flex;flex-direction:column;gap:8px;
  flex-shrink:0;
}

.bet-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.chip{
  border:none;border-radius:50%;width:42px;height:42px;
  font-size:.7rem;font-weight:700;cursor:pointer;color:#fff;
  transition:transform .12s,filter .12s;
  box-shadow:0 3px 7px rgba(0,0,0,.45),inset 0 1px rgba(255,255,255,.22),inset 0 -2px rgba(0,0,0,.3);
}
.chip:hover:not(:disabled){filter:brightness(1.15)}
.chip:active:not(:disabled){transform:scale(.9)}
.chip:disabled{opacity:.32;cursor:not-allowed}
.chip[data-v="50"]{background:#2575fc}
.chip[data-v="100"]{background:#d4145a}
.chip[data-v="200"]{background:#7b2ff7}
.chip[data-v="500"]{background:#e67e22}
.chip[data-v="1000"]{background:#219150}

.bet-display{flex:1;font-size:.8rem;color:var(--gold);font-weight:600;text-align:right}
.btn-clear{
  padding:5px 11px;background:rgba(255,255,255,.09);
  border:1px solid rgba(255,255,255,.14);border-radius:8px;
  color:var(--ink);font-size:.72rem;cursor:pointer;font-family:var(--font);
}
.btn-clear:hover:not(:disabled){background:rgba(255,255,255,.14)}
.btn-clear:disabled{opacity:.35;cursor:not-allowed}

.action-row{display:flex;gap:7px;flex-wrap:wrap}
.btn-action{
  flex:1;padding:9px 12px;border:none;border-radius:10px;
  font-size:.82rem;font-weight:700;cursor:pointer;font-family:var(--font);
  transition:opacity .15s,transform .1s,filter .12s;min-width:60px;
}
.btn-action:hover:not(:disabled){filter:brightness(1.12)}
.btn-action:active:not(:disabled){transform:scale(.95)}
.btn-action:disabled{opacity:.32;cursor:not-allowed}
.btn-hit{background:#d4145a;color:#fff}
.btn-stand{background:#2575fc;color:#fff}
.btn-double{background:#e67e22;color:#fff}
.btn-split{background:#7b2ff7;color:#fff}
.btn-surrender{background:rgba(255,255,255,.1);color:var(--ink);border:1px solid rgba(255,255,255,.18)}
.btn-ins-yes{background:#219150;color:#fff}
.btn-ins-no{background:rgba(255,255,255,.09);color:var(--ink);border:1px solid rgba(255,255,255,.18)}

.btn-deal{
  width:100%;padding:11px;border:none;border-radius:11px;
  font-size:.92rem;font-weight:700;cursor:pointer;font-family:var(--font);
  background:var(--gold);color:#1a1200;
  transition:opacity .15s,filter .15s;
}
.btn-deal:hover:not(:disabled){filter:brightness(1.08)}
.btn-deal:disabled{opacity:.38;cursor:not-allowed}

.phase-info{
  text-align:center;font-size:.78rem;color:var(--muted);padding:8px 0;
}

/* ── Log panel ── */
.log-panel{
  grid-column:2;grid-row:1/3;
  background:rgba(0,0,0,.42);
  border-left:1px solid rgba(255,255,255,.07);
  display:flex;flex-direction:column;overflow:hidden;
}
.log-title{
  padding:9px 12px;font-size:.65rem;color:var(--muted);
  text-transform:uppercase;letter-spacing:.09em;
  border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0;
}
.log-body{
  flex:1;overflow-y:auto;padding:7px 8px;
  display:flex;flex-direction:column;gap:3px;
  font-size:.67rem;color:var(--muted);line-height:1.45;
}
.log-body::-webkit-scrollbar{width:3px}
.log-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
.le{padding:2px 4px}
.le.hi{color:var(--gold)}
.le.good{color:var(--ok)}
.le.bad{color:var(--danger)}
.le.sys{color:rgba(255,255,255,.28);font-style:italic}

/* ── Rules overlay ── */
.overlay{
  display:none;position:fixed;inset:0;z-index:100;
  background:rgba(0,0,0,.75);backdrop-filter:blur(4px);
  align-items:center;justify-content:center;
}
.overlay.show{display:flex}
.overlay-box{
  background:rgba(8,20,18,.95);border:1px solid rgba(255,255,255,.12);
  border-radius:16px;padding:24px 28px;max-width:360px;width:90%;
  display:flex;flex-direction:column;gap:10px;
}
.overlay-box h3{font-size:1rem;color:var(--gold);font-weight:700}
.overlay-box ul{font-size:.78rem;color:var(--muted);line-height:1.7;padding-left:16px}
.overlay-box ul li{margin-bottom:2px}
.overlay-close{
  align-self:flex-end;padding:7px 18px;background:var(--gold);color:#1a1200;
  border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:var(--font);
}
</style>
</head>
<body>

<div class="topbar">
  <span class="topbar-title">🃏 21點</span>
  <span class="topbar-sub">Blackjack</span>
  <div class="topbar-spacer"></div>
  <span class="hand-badge" id="hand-badge">第 0 局</span>
  <button class="rules-btn" onclick="restartGame()">重開</button>
  <button class="rules-btn" onclick="toggleRules()">規則</button>
</div>

<div class="app">
  <div class="table-wrap">
    <div class="dealer-zone">
      <div class="dealer-label">莊家</div>
      <div class="cards" id="dealer-cards"></div>
      <div class="dealer-score" id="dealer-score"></div>
    </div>
    <div class="msg-bar" id="msg-bar"></div>
    <div class="players-row" id="players-row"></div>
  </div>

  <div class="controls" id="controls"></div>

  <div class="log-panel">
    <div class="log-title">遊戲記錄</div>
    <div class="log-body" id="log-body"></div>
  </div>
</div>

<!-- Rules overlay -->
<div class="overlay" id="overlay">
  <div class="overlay-box">
    <h3>21點規則</h3>
    <ul>
      <li>目標：手牌點數盡量接近 21，但不能超過（爆牌）</li>
      <li>A 可算 1 或 11；J/Q/K 算 10</li>
      <li>Blackjack（A + 10點牌）賠率 3:2</li>
      <li><b>要牌</b>：再拿一張牌</li>
      <li><b>停牌</b>：不再拿牌</li>
      <li><b>加倍</b>：追加等額下注，只拿一張牌（首次行動）</li>
      <li><b>分牌</b>：兩張相同點值可分成兩手（追加同額下注）</li>
      <li><b>投降</b>：首次行動可棄牌，取回一半注碼</li>
      <li><b>保險</b>：莊家亮 A 時，可下注一半賭莊家 Blackjack（賠 2:1）</li>
      <li>莊家在 16 點以下必須要牌，17 點以上停牌</li>
      <li>所有玩家 vs 莊家，互不影響</li>
    </ul>
    <button class="overlay-close" onclick="toggleRules()">關閉</button>
  </div>
</div>

<script>
'use strict';

// ── Constants ───────────────────────────────────────────────────────────
const SUITS = ['♠','♥','♦','♣'];
const RED = new Set(['♥','♦']);
const RL = r => r===1?'A':r===11?'J':r===12?'Q':r===13?'K':String(r);
const RV = r => r>=10?10:r; // non-ace value

// ── AI Personalities ────────────────────────────────────────────────────
const PERSONAS = [
  {
    key:'conservative', label:'穩重', color:'#2575fc',
    lines:['照策略走，穩穩的。','不急，慢慢來。','風險管理第一。','這種牌停比較安全。','看莊家的牌再決定。','17點，停。','輸少算贏。','基本策略不說謊。','保守點沒什麼不好。','等好機會。']
  },
  {
    key:'aggressive', label:'火爆', color:'#d4145a',
    lines:['再來一張！','加倍！我喜歡！','沒有最大只有更大！','16點？繼續叫！','怕什麼，賭！','輸了再贏回來！','大的來！','梭哈！','不拼不行！','莊家你等著！']
  },
  {
    key:'superstitious', label:'迷信', color:'#e67e22',
    lines:['今天手氣好，繼續！','剛才那張不吉利。','我夢到K要來了。','左手癢，要贏了。','牌桌風水不對。','心誠則靈。','換個坐法試試。','感覺下一張是好牌。','運氣在我這邊。','停，直覺叫我停。']
  },
  {
    key:'veteran', label:'老手', color:'#219150',
    lines:['小牌出多了，大牌要來了。','莊家是5，大概會爆。','這局有利，加注。','觀察才是關鍵。','我見過更難的局。','耐心等好牌。','算算還有多少大牌。','控制注碼，長線作戰。','局勢對我有利。','不急，看情況。']
  }
];

// ── State ───────────────────────────────────────────────────────────────
let G = {
  players:[],
  dealer:{hand:[], hidden:true},
  shoe:[],
  phase:'idle',
  curIdx:0,      // index into players[] of who's acting
  pendingBet:0,
  handNum:0,
  minBet:50,
};

// ── Deck utils ──────────────────────────────────────────────────────────
function buildShoe(n=6){
  const s=[];
  for(let d=0;d<n;d++) for(const suit of SUITS) for(let r=1;r<=13;r++) s.push({r,suit});
  shuffle(s); return s;
}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=0|Math.random()*(i+1);[a[i],a[j]]=[a[j],a[i]]}}
function deal(){if(G.shoe.length<52)G.shoe=buildShoe();return G.shoe.pop()}

function score(hand){
  let t=0,a=0;
  for(const c of hand){if(c.r===1){a++;t+=11}else t+=Math.min(c.r,10)}
  while(t>21&&a>0){t-=10;a--}
  return t;
}
function bust(hand){return score(hand)>21}
function bj(hand){return hand.length===2&&score(hand)===21}
function pair(hand){return hand.length===2&&Math.min(hand[0].r,10)===Math.min(hand[1].r,10)}

// ── AI ──────────────────────────────────────────────────────────────────
function aiDecision(p){
  const s=score(p.hand), dUp=G.dealer.hand[0], dv=dUp?Math.min(dUp.r,10):10;
  const canDbl=p.hand.length===2&&p.stack>=p.bet;
  const canSpl=pair(p.hand)&&p.stack>=p.bet&&!p.split;

  if(p.key==='aggressive'){
    if(canSpl&&Math.min(p.hand[0].r,10)>=7)return'split';
    if(canDbl&&s>=9&&s<=11)return'double';
    return s<=17?'hit':'stand';
  }
  if(p.key==='superstitious'){
    if(s<=11)return'hit';
    if(s>=18)return'stand';
    return Math.random()<.55?'hit':'stand';
  }
  if(p.key==='veteran'){
    if(canSpl){
      const pv=Math.min(p.hand[0].r,10);
      if(pv===1||pv===8)return'split';
      if(pv===9&&dv!==7&&dv!==10&&dv!==1)return'split';
      if(pv<=7&&pv>=2&&dv<=7)return'split';
    }
    if(canDbl){
      if(s===11)return'double';
      if(s===10&&dv<=9)return'double';
      if(s===9&&dv>=3&&dv<=6)return'double';
    }
  }
  // conservative + veteran basic
  if(canDbl&&(s===11||(s===10&&dv<=9)))return'double';
  if(s<=11)return'hit';
  if(s===12&&dv>=4&&dv<=6)return'stand';
  if(s>=13&&s<=16&&dv<=6)return'stand';
  if(s>=17)return'stand';
  return'hit';
}

function aiBetAmt(p){
  const opts={aggressive:[100,200,200,500,500],veteran:[100,200,500],superstitious:[50,100,200,200],conservative:[50,50,100,100,200]};
  const arr=opts[p.key]||[100];
  return Math.min(arr[0|Math.random()*arr.length],p.stack);
}

// ── Table talk ──────────────────────────────────────────────────────────
function speak(p, chance=.25){
  if(!p||p.isHuman)return;
  const now=Date.now();
  if(now<(p.talkUntil||0))return;
  if(Math.random()>chance)return;
  const persona=PERSONAS.find(x=>x.key===p.key);
  if(!persona)return;
  const line=persona.lines[0|Math.random()*persona.lines.length];
  p.talk=line; p.talkUntil=now+3200;
  setTimeout(()=>{p.talk='';renderSeats()},3200);
}

// ── Init players ────────────────────────────────────────────────────────
function initPlayers(){
  const perm=[...PERSONAS].sort(()=>Math.random()-.5).slice(0,3);
  G.players=[
    mkPlayer(0,'電腦甲',perm[0],false),
    mkPlayer(1,'你',    null,    true),
    mkPlayer(2,'電腦乙',perm[1],false),
    mkPlayer(3,'電腦丙',perm[2],false),
  ];
}
function mkPlayer(i,name,persona,isHuman){
  return{
    i, name, isHuman,
    key:persona?.key||'human',
    label:persona?.label||'',
    color:persona?.color||'rgba(255,255,255,.25)',
    stack:2000, bet:0, hand:[],
    status:'idle', result:null,
    insurance:0, split:false,
    talk:'', talkUntil:0,
  };
}

// ── Game flow ───────────────────────────────────────────────────────────
function startBetting(){
  G.phase='betting'; G.pendingBet=0;
  G.dealer={hand:[], hidden:true};
  for(const p of G.players){
    p.hand=[]; p.bet=0; p.status='idle'; p.result=null;
    p.insurance=0; p.split=false; p.talk=''; p.talkUntil=0;
    if(p.stack<=0){p.stack=2000;addLog(`${p.name} 補充籌碼 2000`,'sys')}
  }
  // AI bets
  for(const p of G.players){
    if(!p.isHuman){p.bet=aiBetAmt(p);p.stack-=p.bet;speak(p,.2)}
  }
  G.msg='請下注（最低 '+G.minBet+'）';
  render();
  addLog('─── 第 '+(G.handNum+1)+' 局 ───','sys');
}

function confirmBet(){
  const h=human();
  if(G.pendingBet<G.minBet){setMsg('最低下注 '+G.minBet);return}
  if(G.pendingBet>h.stack){setMsg('籌碼不足');return}
  h.bet=G.pendingBet; h.stack-=G.pendingBet; G.pendingBet=0;
  dealInit();
}

async function dealInit(){
  G.phase='dealing'; G.handNum++; render();
  // 每人先發一張，再發一張
  for(const p of G.players){await sl(220);p.hand.push(deal());animNewCard(p.i,-1);renderSeats()}
  await sl(220); G.dealer.hand.push(deal()); renderDealer();
  for(const p of G.players){await sl(220);p.hand.push(deal());animNewCard(p.i,-1);renderSeats()}
  await sl(220); G.dealer.hand.push(deal()); renderDealer(); // hidden
  await sl(300);

  // BJ check on players
  for(const p of G.players) if(bj(p.hand)){p.status='blackjack';addLog(p.name+' 拿到 Blackjack！','hi');speak(p,.9)}

  // Insurance?
  if(G.dealer.hand[0].r===1){
    G.phase='insurance'; setMsg('莊家亮 A，要買保險嗎？（費用：下注一半）'); render(); return;
  }
  await checkDealerBJ();
}

async function checkDealerBJ(){
  if(bj(G.dealer.hand)){
    await revealDealer();
    setMsg('莊家 Blackjack！');
    addLog('莊家 Blackjack！','bad');
    await sl(400);
    await payout(true);
  } else {
    await nextPlayer(0);
  }
}

function buyInsurance(yes){
  const h=human();
  if(yes){
    const ins=Math.floor(h.bet/2);
    if(h.stack>=ins){h.insurance=ins;h.stack-=ins;addLog('你買了保險 '+ins,'hi')}
    else{setMsg('籌碼不足，無法買保險')}
  }
  checkDealerBJ();
}

async function nextPlayer(idx){
  G.curIdx=idx;
  if(idx>=G.players.length){await dealerTurn();return}
  const p=G.players[idx];
  if(p.status==='blackjack'||p.status==='bust'||p.status==='stand'||p.status==='surrender'){
    await nextPlayer(idx+1); return;
  }
  G.phase='player-turn';
  if(p.isHuman){
    setMsg('你的牌：'+score(p.hand)+' 點，請選擇行動');
    render(); return;
  }
  render(); await sl(650);
  await aiTurn(p);
  await nextPlayer(idx+1);
}

async function aiTurn(p){
  let first=true;
  while(true){
    const act=aiDecision(p);
    speak(p, first?.3:.15); first=false;
    addLog(p.name+'（'+p.label+'）：'+actLabel(act),'');

    if(act==='split'&&!p.split){
      p.stack-=p.bet; p.split=true;
      p.hand.push(deal()); renderSeats(); await sl(400);
      // continue playing this extended hand
      continue;
    }
    if(act==='double'){
      const extra=Math.min(p.bet,p.stack);
      p.stack-=extra; p.bet+=extra;
      p.hand.push(deal()); renderSeats(); await sl(400);
      if(bust(p.hand)){p.status='bust';addLog(p.name+' 爆牌 ('+score(p.hand)+'點)','bad');speak(p,.7)}
      else{p.status='stand';addLog(p.name+' 加倍停牌 '+score(p.hand)+'點','')}
      return;
    }
    if(act==='hit'){
      p.hand.push(deal()); renderSeats(); await sl(400);
      if(bust(p.hand)){p.status='bust';addLog(p.name+' 爆牌 ('+score(p.hand)+'點)','bad');speak(p,.7);return}
      continue;
    }
    // stand
    p.status='stand'; return;
  }
}

// Human actions
async function doHit(){
  if(!isMyTurn())return;
  const p=human();
  p.hand.push(deal()); animNewCard(p.i,-1); addLog('你要牌','hi'); renderSeats(); await sl(150);
  if(bust(p.hand)){
    p.status='bust'; setMsg('爆牌！（'+score(p.hand)+' 點）'); addLog('你爆牌了！','bad');
    await sl(700); await nextPlayer(G.curIdx+1);
  } else {
    setMsg('你的牌：'+score(p.hand)+' 點，繼續選擇'); render();
  }
}
async function doStand(){
  if(!isMyTurn())return;
  human().status='stand'; addLog('你停牌','hi'); await nextPlayer(G.curIdx+1);
}
async function doDouble(){
  if(!isMyTurn())return;
  const p=human(); const extra=Math.min(p.bet,p.stack);
  if(extra===0){setMsg('籌碼不足');return}
  p.stack-=extra; p.bet+=extra;
  p.hand.push(deal()); animNewCard(p.i,-1); addLog('你加倍，注碼：'+p.bet,'hi'); renderSeats(); await sl(300);
  if(bust(p.hand)){p.status='bust';setMsg('加倍後爆牌！（'+score(p.hand)+'點）');addLog('加倍後爆牌','bad')}
  else{p.status='stand';setMsg('加倍後停牌：'+score(p.hand)+' 點')}
  await sl(600); await nextPlayer(G.curIdx+1);
}
async function doSplit(){
  if(!isMyTurn())return;
  const p=human();
  if(!pair(p.hand)||p.stack<p.bet){setMsg('無法分牌');return}
  p.stack-=p.bet; p.split=true;
  p.hand.push(deal()); animNewCard(p.i,-1); addLog('你分牌','hi'); renderSeats(); await sl(200);
  setMsg('分牌後：'+score(p.hand)+' 點，繼續行動'); render();
}
async function doSurrender(){
  if(!isMyTurn())return;
  const p=human();
  const ret=Math.floor(p.bet/2); p.stack+=ret; p.bet-=ret;
  p.status='surrender'; addLog('你投降，取回 '+ret,'hi');
  await nextPlayer(G.curIdx+1);
}

function isMyTurn(){return G.phase==='player-turn'&&G.curIdx===human().i}

async function dealerTurn(){
  G.phase='dealer-turn'; setMsg('莊家行動中...'); render(); await sl(500);
  await revealDealer(); await sl(400);
  while(score(G.dealer.hand)<17){
    await sl(550); G.dealer.hand.push(deal()); renderDealer();
    addLog('莊家要牌：'+score(G.dealer.hand)+' 點','');
  }
  const ds=score(G.dealer.hand);
  addLog('莊家停牌：'+ds+(bust(G.dealer.hand)?' → 爆牌':'')+'', bust(G.dealer.hand)?'good':'');
  await sl(400); await payout(false);
}

async function revealDealer(){
  G.dealer.hidden=false; renderDealer();
  addLog('莊家開牌：'+score(G.dealer.hand)+' 點','');
}

async function payout(dealerBJ){
  G.phase='payout';
  const ds=score(G.dealer.hand), dbust=bust(G.dealer.hand);
  for(const p of G.players){
    if(p.status==='surrender'){p.result='surrender';addLog(p.name+' 投降（取回一半）','');continue}
    const ps=score(p.hand), pbj=bj(p.hand), pbust=p.status==='bust';

    if(pbust){p.result='lose';addLog(p.name+' 爆牌，負 '+p.bet,'bad')}
    else if(dealerBJ&&pbj){
      p.result='push'; p.stack+=p.bet; addLog(p.name+' 平手（雙BJ）','');
      if(p.insurance){p.stack+=p.insurance;addLog(p.name+' 保險退回','hi')}
    }
    else if(dealerBJ){
      p.result='lose'; addLog(p.name+' 莊家BJ，負 '+p.bet,'bad');
      if(p.insurance){const ins=p.insurance*3;p.stack+=ins;addLog(p.name+' 保險賠付 '+ins,'good')}
    }
    else if(pbj){
      const win=Math.floor(p.bet*1.5); p.result='blackjack';
      p.stack+=p.bet+win; addLog(p.name+' Blackjack！贏 '+win,'good'); speak(p,.85);
    }
    else if(dbust){
      p.result='win'; p.stack+=p.bet*2; addLog(p.name+' 莊家爆牌，贏 '+p.bet,'good'); speak(p,.6);
    }
    else if(ps>ds){
      p.result='win'; p.stack+=p.bet*2; addLog(p.name+' '+ps+'>'+ds+'，贏 '+p.bet,'good'); speak(p,.5);
    }
    else if(ps===ds){
      p.result='push'; p.stack+=p.bet; addLog(p.name+' 平手 '+ps,'');
    }
    else{
      p.result='lose'; addLog(p.name+' '+ps+'<'+ds+'，負 '+p.bet,'bad'); speak(p,.5);
    }
  }
  const dres=bust(G.dealer.hand)?'爆牌！':score(G.dealer.hand)+' 點';
  setMsg('莊家 '+dres+'　點擊「下一局」繼續');
  render();
}

// ── Helpers ─────────────────────────────────────────────────────────────
const sl = ms => new Promise(r=>setTimeout(r,ms));
const human = () => G.players.find(p=>p.isHuman);
const actLabel = a=>({hit:'要牌',stand:'停牌',double:'加倍',split:'分牌',surrender:'投降'})[a]||a;

function setMsg(m){G.msg=m;const el=document.getElementById('msg-bar');if(el)el.textContent=m}
function addLog(msg,cls=''){
  const body=document.getElementById('log-body');
  if(!body)return;
  const el=document.createElement('div');
  el.className='le'+(cls?' '+cls:'');el.textContent=msg;
  body.appendChild(el);body.scrollTop=body.scrollHeight;
}

function animNewCard(playerIdx, cardIdx){
  // Animate the last card added to a player
  const rows=document.getElementById('players-row');
  if(!rows)return;
  const seats=rows.querySelectorAll('.seat');
  const seat=seats[playerIdx];
  if(!seat)return;
  const cards=seat.querySelectorAll('.card');
  const card=cardIdx===-1?cards[cards.length-1]:cards[cardIdx];
  if(!card)return;
  card.classList.add('new');
  anime({targets:card,opacity:[0,1],translateY:[8,0],duration:220,easing:'easeOutQuad',complete:()=>card.classList.remove('new')});
}

// ── Render ───────────────────────────────────────────────────────────────
function renderCard(c, faceDown=false){
  const el=document.createElement('div');
  if(faceDown){el.className='card face-down';return el}
  el.className='card face-up'+(RED.has(c.suit)?' red':'');
  el.innerHTML=`<span class="card-rank">${RL(c.r)}</span><span class="card-suit">${c.suit}</span>`;
  return el;
}

function renderDealer(){
  const zone=document.getElementById('dealer-cards');
  if(!zone)return;
  zone.innerHTML='';
  G.dealer.hand.forEach((c,i)=>{
    zone.appendChild(renderCard(c, i===1&&G.dealer.hidden));
  });
  const se=document.getElementById('dealer-score');
  if(!se)return;
  if(G.dealer.hand.length===0){se.textContent='';return}
  if(G.dealer.hidden&&G.dealer.hand.length>=1){
    const v=G.dealer.hand[0].r===1?11:Math.min(G.dealer.hand[0].r,10);
    se.textContent=v+' + ?';
  } else {
    const s=score(G.dealer.hand);
    se.textContent=s+' 點'+(bust(G.dealer.hand)?'　爆牌！':'')+(bj(G.dealer.hand)?'　Blackjack！':'');
  }
}

function renderSeats(){
  const row=document.getElementById('players-row');
  if(!row)return;
  row.innerHTML='';
  for(const p of G.players){
    const isActive=G.phase==='player-turn'&&G.curIdx===p.i&&!['bust','stand','blackjack','surrender'].includes(p.status);
    const cl=['seat'];
    if(isActive)cl.push('active');
    if(p.status==='bust')cl.push('bust');
    if(p.result==='win'||p.result==='blackjack')cl.push('winner');
    if(p.isHuman)cl.push('is-human');
    const seat=document.createElement('div');
    seat.className=cl.join(' ');

    if(p.talk){
      const tb=document.createElement('div');
      tb.className='table-talk';tb.textContent=p.talk;seat.appendChild(tb);
    }
    if(p.result&&p.result!=='surrender'){
      const tag=document.createElement('div');
      tag.className='payout-tag '+p.result;
      tag.textContent={win:'贏 ↑',lose:'負',push:'平',blackjack:'BJ!'}[p.result]||p.result;
      seat.appendChild(tag);
    }

    // Avatar
    const av=document.createElement('div');
    av.className='seat-avatar';
    av.style.background=p.isHuman?'rgba(242,184,75,.25)':p.color+'44';
    av.style.borderColor=p.isHuman?'var(--gold)':p.color;
    av.textContent=p.isHuman?'你':p.name.slice(-1);
    seat.appendChild(av);

    const nm=document.createElement('div');nm.className='seat-name';nm.textContent=p.name;seat.appendChild(nm);
    if(!p.isHuman&&p.label){const pe=document.createElement('div');pe.className='personality';pe.textContent=p.label;seat.appendChild(pe)}

    // Cards
    const cardsEl=document.createElement('div');cardsEl.className='cards';
    for(const c of p.hand)cardsEl.appendChild(renderCard(c,false));
    seat.appendChild(cardsEl);

    // Score
    const sc=document.createElement('div');sc.className='seat-score';
    if(p.hand.length>0){
      const s=score(p.hand);
      sc.textContent=s+' 點'+(bj(p.hand)&&p.hand.length===2?' ★':'');
    }
    seat.appendChild(sc);

    // Status
    const stMap={bust:'爆牌',stand:'停牌',blackjack:'Blackjack!',idle:'',surrender:'投降'};
    if(p.status&&p.status!=='idle'){
      const st=document.createElement('div');
      st.className='seat-status '+(p.result||p.status);
      st.textContent=stMap[p.status]||p.status;
      seat.appendChild(st);
    }

    const be=document.createElement('div');be.className='seat-bet';
    if(p.bet>0)be.textContent='注：'+p.bet.toLocaleString('zh-TW');
    seat.appendChild(be);

    const ste=document.createElement('div');ste.className='seat-stack';
    ste.textContent='籌碼：'+p.stack.toLocaleString('zh-TW');
    seat.appendChild(ste);

    row.appendChild(seat);
  }
}

function renderControls(){
  const ctrl=document.getElementById('controls');
  if(!ctrl)return;
  ctrl.innerHTML='';

  if(G.phase==='idle'){
    const b=document.createElement('button');
    b.className='btn-deal';b.textContent='開始遊戲';
    b.onclick=()=>{initPlayers();G.shoe=buildShoe();startBetting()};
    ctrl.appendChild(b);
    return;
  }

  if(G.phase==='betting'){
    const h=human();
    const br=document.createElement('div');br.className='bet-row';
    [50,100,200,500,1000].forEach(v=>{
      const c=document.createElement('button');
      c.className='chip';c.dataset.v=v;
      c.textContent=v>=1000?'1K':String(v);
      c.disabled=G.pendingBet+v>h.stack;
      c.onclick=()=>{if(G.pendingBet+v>h.stack)return;G.pendingBet+=v;renderControls()};
      br.appendChild(c);
    });
    const bd=document.createElement('div');bd.className='bet-display';
    bd.textContent=G.pendingBet>0?'下注：'+G.pendingBet.toLocaleString('zh-TW'):'尚未下注';
    br.appendChild(bd);
    const cl=document.createElement('button');cl.className='btn-clear';cl.textContent='清除';
    cl.disabled=G.pendingBet===0;
    cl.onclick=()=>{G.pendingBet=0;renderControls()};
    br.appendChild(cl);
    ctrl.appendChild(br);
    const db=document.createElement('button');db.className='btn-deal';
    db.textContent='確認下注，發牌';db.disabled=G.pendingBet<G.minBet;
    db.onclick=confirmBet;ctrl.appendChild(db);
    return;
  }

  if(G.phase==='insurance'){
    const row=document.createElement('div');row.className='action-row';
    const y=document.createElement('button');y.className='btn-action btn-ins-yes';y.textContent='買保險';y.onclick=()=>buyInsurance(true);
    const n=document.createElement('button');n.className='btn-action btn-ins-no';n.textContent='不買';n.onclick=()=>buyInsurance(false);
    row.appendChild(y);row.appendChild(n);ctrl.appendChild(row);
    return;
  }

  if(G.phase==='player-turn'){
    const h=human();
    const mine=G.curIdx===h.i&&!['bust','stand','blackjack','surrender'].includes(h.status);
    const firstAct=h.hand.length===2;
    const row=document.createElement('div');row.className='action-row';

    const mkBtn=(cls,txt,dis,fn)=>{
      const b=document.createElement('button');b.className='btn-action '+cls;
      b.textContent=txt;b.disabled=!mine||dis;b.onclick=fn;return b;
    };
    row.appendChild(mkBtn('btn-hit','要牌',false,doHit));
    row.appendChild(mkBtn('btn-stand','停牌',false,doStand));
    row.appendChild(mkBtn('btn-double','加倍',!firstAct||h.stack<h.bet,doDouble));
    row.appendChild(mkBtn('btn-split','分牌',!pair(h.hand)||h.stack<h.bet||h.split,doSplit));
    row.appendChild(mkBtn('btn-surrender','投降',!firstAct,doSurrender));
    ctrl.appendChild(row);
    return;
  }

  if(G.phase==='payout'){
    const b=document.createElement('button');b.className='btn-deal';b.textContent='下一局';
    b.onclick=startBetting;ctrl.appendChild(b);
    return;
  }

  // dealing / dealer-turn
  const info=document.createElement('div');info.className='phase-info';
  info.textContent={dealing:'發牌中…','dealer-turn':'莊家行動中…'}[G.phase]||'';
  ctrl.appendChild(info);
}

function render(){
  const mb=document.getElementById('msg-bar');if(mb)mb.textContent=G.msg||'';
  const hb=document.getElementById('hand-badge');if(hb)hb.textContent='第 '+G.handNum+' 局';
  renderDealer(); renderSeats(); renderControls();
}

function toggleRules(){document.getElementById('overlay').classList.toggle('show')}

function restartGame(){
  const safe=['idle','payout','betting'];
  if(!safe.includes(G.phase)&&!confirm('確定重新開局？本局將放棄。'))return;
  initPlayers(); G.shoe=buildShoe(); G.handNum=0;
  document.getElementById('log-body').innerHTML='';
  addLog('─── 重新開局 ───','sys');
  startBetting();
}

// ── Boot ─────────────────────────────────────────────────────────────────
window.addEventListener('load',()=>{
  G.shoe=buildShoe();
  G.msg='點擊「開始遊戲」開始';
  render();
  addLog('歡迎來到 21點！','sys');
  addLog('你 vs 莊家，共 4 位玩家。','sys');
});
</script>
</body>
</html>
