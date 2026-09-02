<?php $title="大老二 · 大富豪"; ?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title><?=$title?></title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+TC:wght@400;500;700&display=swap">
<script src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.2/anime.min.js"></script>
<style>
:root{
  color-scheme:dark;
  --felt:#176247;--felt-dark:#0d352a;--gold:#f2b84b;
  --ink:#eef8f3;--muted:#9fb9ae;--danger:#ff6b6b;--ok:#67e8a1;
  --rev:#c084fc;/* 革命紫 */
  --font:'Inter','Noto Sans TC',sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
body{
  font-family:var(--font);
  background:radial-gradient(ellipse at 50% 30%,#0b2a1f 0%,#060e0b 100%);
  color:var(--ink);height:100dvh;display:flex;flex-direction:column;overflow:hidden;
}

/* ── Topbar ── */
.topbar{
  display:flex;align-items:center;gap:10px;padding:9px 16px;
  background:rgba(0,0,0,.45);border-bottom:1px solid rgba(255,255,255,.08);
  flex-shrink:0;z-index:10;
}
.topbar-title{font-size:.95rem;font-weight:700;color:var(--gold);letter-spacing:.04em}
.topbar-sub{font-size:.72rem;color:var(--muted)}
.topbar-spacer{flex:1}
.round-badge{font-size:.68rem;color:var(--muted);background:rgba(255,255,255,.07);padding:3px 9px;border-radius:99px}
.rev-badge{
  font-size:.68rem;font-weight:700;padding:3px 9px;border-radius:99px;
  background:rgba(192,132,252,.2);color:var(--rev);border:1px solid rgba(192,132,252,.3);
  display:none;
}
.rev-badge.on{display:block;animation:revPulse 1.5s ease-in-out infinite}
@keyframes revPulse{0%,100%{opacity:.7}50%{opacity:1}}
.topbar-btn{
  font-size:.68rem;color:var(--muted);background:rgba(255,255,255,.07);
  border:none;padding:3px 9px;border-radius:99px;cursor:pointer;font-family:var(--font);
}
.topbar-btn:hover{color:var(--ink)}
.online-badge{
  font-size:.68rem;color:var(--ok);
  background:rgba(103,232,161,.1);padding:3px 9px;border-radius:99px;
  white-space:nowrap;
}
.save-badge{
  font-size:.68rem;color:var(--muted);
  padding:3px 9px;border-radius:99px;
  opacity:0;transition:opacity .4s;pointer-events:none;
}
.save-badge.show{opacity:1}

/* ── App layout ── */
.app{
  flex:1;display:grid;
  grid-template-columns:1fr 210px;
  grid-template-rows:1fr auto;
  overflow:hidden;min-height:0;
}
@media(max-width:820px){
  .app{grid-template-columns:1fr;grid-template-rows:1fr auto}
}

/* ── Table ── */
.table-wrap{
  grid-column:1;grid-row:1;
  display:grid;
  grid-template-areas:
    ". ai-top ."
    "ai-left center ai-right"
    "human human human";
  grid-template-columns:130px 1fr 130px;
  grid-template-rows:140px 1fr 130px;
  gap:8px;padding:12px;
  overflow:hidden;min-height:0;
  background:
    radial-gradient(ellipse at 50% 10%,rgba(23,98,71,.35) 0%,transparent 65%),
    radial-gradient(ellipse at 50% 90%,rgba(23,98,71,.2) 0%,transparent 60%);
}
@media(max-width:820px){
  .table-wrap{
    grid-template-columns:1fr 1fr 1fr;
    grid-template-rows:110px minmax(140px,1fr) 130px;
    grid-template-areas:
      "ai-left ai-top ai-right"
      "center center center"
      "human human human";
    gap:6px;padding:8px;
  }
  /* ai-top 在 mobile 跟 left/right 同樣垂直排列 */
  .ai-top{flex-direction:column;gap:4px}
}

/* ── AI Seats ── */
[data-area]{grid-area:attr(data-area)}
.ai-seat{
  display:flex;flex-direction:column;align-items:center;gap:4px;
  padding:8px 10px;border-radius:13px;
  background:rgba(0,0,0,.3);border:1.5px solid rgba(255,255,255,.09);
  position:relative;transition:border-color .3s,box-shadow .3s;
  min-width:0;
}
.ai-seat.active{border-color:var(--gold);box-shadow:0 0 16px rgba(242,184,75,.28)}
.ai-seat.done{opacity:.5}
.ai-top{grid-area:ai-top;flex-direction:row;flex-wrap:wrap;justify-content:center;align-items:center;gap:8px}

.ai-avatar{
  width:32px;height:32px;border-radius:50%;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;
  border:2px solid rgba(255,255,255,.12);
}
.ai-name{font-size:.7rem;font-weight:600;white-space:nowrap}
.ai-card-count{
  font-size:.65rem;color:var(--muted);
  background:rgba(0,0,0,.3);padding:1px 6px;border-radius:99px;
}
.personality{font-size:.58rem;color:var(--muted);background:rgba(255,255,255,.07);padding:1px 5px;border-radius:99px}
.rank-tag{
  font-size:.6rem;font-weight:700;padding:2px 5px;border-radius:4px;white-space:nowrap;
}
.rank-tag.daifugou{background:var(--gold);color:#1a1200}
.rank-tag.fugou{background:rgba(242,184,75,.35);color:var(--gold)}
.rank-tag.heimin{background:rgba(255,255,255,.1);color:var(--muted)}
.rank-tag.daihinmin{background:rgba(255,107,107,.25);color:var(--danger)}

.ai-cards{display:flex;justify-content:center}
.back-card{
  width:22px;height:32px;border-radius:4px;
  background:linear-gradient(135deg,#1a3a8f 25%,#122a6a 100%);
  border:1px solid rgba(255,255,255,.2);
  margin-left:-8px;box-shadow:1px 2px 5px rgba(0,0,0,.4);
  flex-shrink:0;
}
.back-card:first-child{margin-left:0}

.table-talk{
  position:absolute;top:-30px;left:50%;transform:translateX(-50%);
  background:rgba(5,18,15,.92);border:1px solid rgba(255,255,255,.15);border-radius:8px;
  padding:3px 8px;font-size:.6rem;color:var(--ink);
  white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;
  pointer-events:none;z-index:5;animation:talkIn .2s ease;
}
@keyframes talkIn{from{opacity:0;transform:translateX(-50%) translateY(4px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

/* ── Center play area ── */
.center{
  grid-area:center;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:8px;padding:10px;
  background:rgba(0,0,0,.2);border-radius:14px;
  border:1px solid rgba(255,255,255,.06);position:relative;
  align-self:stretch;overflow:hidden;
}
.center-label{font-size:.62rem;color:var(--muted);text-transform:uppercase;letter-spacing:.09em}
.center-who{font-size:.72rem;color:var(--gold);font-weight:600;min-height:14px}
.center-type{font-size:.65rem;color:var(--muted);min-height:12px}
.center-cards{display:flex;flex-wrap:wrap;justify-content:center;gap:0;min-height:48px;align-items:center}
.free-play-hint{font-size:.75rem;color:rgba(255,255,255,.3);font-style:italic}

.pass-badges{display:flex;gap:4px;flex-wrap:wrap;justify-content:center;min-height:16px}
.pass-badge{font-size:.58rem;color:var(--muted);background:rgba(255,255,255,.07);padding:1px 5px;border-radius:99px}

/* ── Cards ── */
.card{
  width:38px;height:54px;border-radius:5px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  border:1px solid rgba(0,0,0,.2);position:relative;flex-shrink:0;
  margin-left:-8px;box-shadow:1px 2px 7px rgba(0,0,0,.4);
}
.card:first-child{margin-left:0}
.card.face-up{background:#fff;color:#1a1a1a}
.card.face-up.red{color:#d7263d}
.card-rank{font-size:.82rem;font-weight:700;line-height:1}
.card-suit{font-size:.72rem;line-height:1}

/* ── Human hand ── */
.human-area{
  grid-area:human;
  display:flex;flex-direction:column;gap:6px;
  overflow:hidden;min-height:0;
}
.hand-label{font-size:.62rem;color:var(--muted);text-transform:uppercase;letter-spacing:.09em;text-align:center}
.hand-cards-wrap{
  overflow-x:auto;overflow-y:visible;
  -webkit-overflow-scrolling:touch;
  scrollbar-width:none;
}
.hand-cards-wrap::-webkit-scrollbar{display:none}
.hand-cards{
  display:flex;flex-wrap:nowrap;gap:0;
  padding:8px 6px 4px;
  min-width:100%;
  justify-content:center;
  align-items:flex-end;
  width:max-content;
}
.hand-card{
  width:42px;height:60px;border-radius:6px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:#fff;color:#1a1a1a;
  border:1.5px solid rgba(0,0,0,.15);
  margin-left:-10px;flex-shrink:0;
  box-shadow:1px 3px 8px rgba(0,0,0,.5);
  cursor:pointer;
  transition:transform .15s,box-shadow .15s,margin-bottom .15s;
  user-select:none;position:relative;
}
.hand-card:first-child{margin-left:0}
.hand-card.red{color:#d7263d}
.hand-card.selected{
  transform:translateY(-10px);
  box-shadow:0 8px 20px rgba(242,184,75,.5);
  border-color:var(--gold);
  z-index:5;
}
.hand-card.locked{border-color:#67e8a1;border-width:2px}
.hand-card.locked::after{
  content:'3♣';position:absolute;bottom:-14px;
  font-size:.52rem;color:var(--ok);white-space:nowrap;
}
.hand-card .card-rank{font-size:.88rem;font-weight:700;line-height:1}
.hand-card .card-suit{font-size:.78rem;line-height:1}

/* ── Controls ── */
.controls{
  grid-column:1;grid-row:2;
  padding:10px 14px 12px;
  background:rgba(0,0,0,.55);border-top:1px solid rgba(255,255,255,.07);
  display:flex;flex-direction:column;gap:7px;flex-shrink:0;
}
.ctrl-row{display:flex;gap:7px;flex-wrap:wrap;align-items:center}
.btn-play{
  flex:1;padding:10px 16px;border:none;border-radius:10px;
  font-size:.88rem;font-weight:700;cursor:pointer;font-family:var(--font);
  background:var(--gold);color:#1a1200;
  transition:opacity .15s,filter .12s,transform .1s;
}
.btn-play:hover:not(:disabled){filter:brightness(1.1)}
.btn-play:active:not(:disabled){transform:scale(.95)}
.btn-play:disabled{opacity:.35;cursor:not-allowed}
.btn-pass{
  padding:10px 20px;border:none;border-radius:10px;
  font-size:.88rem;font-weight:700;cursor:pointer;font-family:var(--font);
  background:rgba(255,255,255,.1);color:var(--ink);
  border:1px solid rgba(255,255,255,.18);
  transition:opacity .15s,filter .12s;
}
.btn-pass:hover:not(:disabled){background:rgba(255,255,255,.16)}
.btn-pass:disabled{opacity:.35;cursor:not-allowed}
.btn-main{
  width:100%;padding:11px;border:none;border-radius:11px;
  font-size:.92rem;font-weight:700;cursor:pointer;font-family:var(--font);
  background:var(--gold);color:#1a1200;transition:opacity .15s,filter .15s;
}
.btn-main:hover:not(:disabled){filter:brightness(1.08)}
.btn-main:disabled{opacity:.38;cursor:not-allowed}
.play-hint{font-size:.72rem;color:var(--muted);text-align:center;min-height:14px}
.phase-info{text-align:center;font-size:.78rem;color:var(--muted);padding:8px 0}

/* ── Log panel ── */
.log-panel{
  grid-column:2;grid-row:1/3;
  background:rgba(0,0,0,.42);border-left:1px solid rgba(255,255,255,.07);
  display:flex;flex-direction:column;overflow:hidden;
}
@media(max-width:820px){.log-panel{display:none}}
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
.le.rev{color:var(--rev)}
.le.sys{color:rgba(255,255,255,.28);font-style:italic}

/* ── Revolution announcement ── */
.rev-announce{
  display:none;position:fixed;inset:0;z-index:200;
  align-items:center;justify-content:center;
  pointer-events:none;
}
.rev-announce.show{display:flex}
.rev-announce-box{
  display:flex;flex-direction:column;align-items:center;gap:10px;
  animation:revAnnIn .3s ease;
}
@keyframes revAnnIn{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:scale(1)}}
.rev-announce-icon{font-size:4rem;line-height:1;filter:drop-shadow(0 0 24px rgba(192,132,252,.9))}
.rev-announce-title{
  font-size:2rem;font-weight:900;letter-spacing:.06em;
  color:var(--rev);text-shadow:0 0 32px rgba(192,132,252,.8),0 0 64px rgba(192,132,252,.4);
}
.rev-announce-sub{font-size:.88rem;color:rgba(255,255,255,.7);font-weight:500}
.rev-announce-who{font-size:.78rem;color:var(--muted)}

/* ── 8-Cut announcement ── */
.cut-announce{
  display:none;position:fixed;inset:0;z-index:200;
  align-items:center;justify-content:center;pointer-events:none;
}
.cut-announce.show{display:flex}
.cut-announce-box{
  display:flex;flex-direction:column;align-items:center;gap:10px;
  animation:revAnnIn .3s ease;
}
.cut-announce-icon{font-size:3.5rem;line-height:1;filter:drop-shadow(0 0 22px rgba(251,191,36,.9))}
.cut-announce-title{
  font-size:2rem;font-weight:900;letter-spacing:.06em;
  color:#fbbf24;text-shadow:0 0 28px rgba(251,191,36,.8),0 0 56px rgba(251,191,36,.4);
}
.cut-announce-sub{font-size:.88rem;color:rgba(255,255,255,.7);font-weight:500}
.cut-announce-who{font-size:.78rem;color:var(--muted)}

/* ── Turn indicator ── */
.turn-info{
  display:flex;align-items:center;gap:6px;font-size:.7rem;
  padding:4px 10px;border-radius:99px;background:rgba(255,255,255,.06);
  margin-top:2px;
}
.turn-cur{color:var(--gold);font-weight:700}
.turn-sep{color:var(--muted);font-size:.6rem}
.turn-next{color:var(--muted)}

/* ── Overlays ── */
.overlay{
  display:none;position:fixed;inset:0;z-index:100;
  background:rgba(0,0,0,.75);backdrop-filter:blur(4px);
  align-items:center;justify-content:center;
}
.overlay.show{display:flex}
.overlay-box{
  background:rgba(8,20,18,.96);border:1px solid rgba(255,255,255,.12);
  border-radius:16px;padding:22px 26px;max-width:380px;width:92%;
  display:flex;flex-direction:column;gap:10px;
}
.overlay-box h3{font-size:1rem;color:var(--gold);font-weight:700}
.exchange-row{
  display:flex;align-items:center;gap:8px;
  font-size:.78rem;color:var(--ink);padding:6px 0;
  border-bottom:1px solid rgba(255,255,255,.07);
}
.exchange-row:last-of-type{border-bottom:none}
.ex-arrow{color:var(--muted);flex-shrink:0}
.ex-cards{display:flex;gap:3px;flex-wrap:wrap}
.ex-card-sm{
  width:28px;height:40px;border-radius:4px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:#fff;color:#1a1a1a;font-size:.62rem;font-weight:700;
  border:1px solid rgba(0,0,0,.15);
}
.ex-card-sm.red{color:#d7263d}
.overlay-close{
  align-self:flex-end;padding:7px 18px;background:var(--gold);color:#1a1200;
  border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:var(--font);
}
.rules-list{font-size:.75rem;color:var(--muted);line-height:1.7;padding-left:14px}
.rules-list li{margin-bottom:2px}
.results-grid{display:flex;flex-direction:column;gap:6px}
.result-row{
  display:flex;align-items:center;gap:10px;
  background:rgba(255,255,255,.05);border-radius:8px;padding:8px 12px;
}
.result-rank{font-size:1rem}
.result-name{flex:1;font-size:.85rem;font-weight:600}
.result-label{font-size:.75rem;padding:2px 7px;border-radius:99px;font-weight:700}

/* ── Memory stats ── */
.mem-section{
  border-top:1px solid rgba(255,255,255,.08);
  padding-top:10px;display:flex;flex-direction:column;gap:8px;
}
.mem-title{font-size:.68rem;color:var(--muted);letter-spacing:.08em;text-transform:uppercase}
.mem-ranks{display:grid;grid-template-columns:1fr 1fr;gap:4px}
.mem-rank-row{display:flex;align-items:center;gap:6px;font-size:.72rem}
.mem-rank-bar-wrap{flex:1;background:rgba(255,255,255,.08);border-radius:99px;height:5px;overflow:hidden}
.mem-rank-bar{height:100%;border-radius:99px;transition:width .5s ease}
.mem-rank-count{font-size:.68rem;color:var(--muted);min-width:26px;text-align:right}
.mem-footer{display:flex;justify-content:space-between;align-items:center;font-size:.68rem;color:var(--muted)}
.mem-streak{color:var(--gold);font-weight:700}
.mem-clear{background:none;border:none;font-size:.65rem;color:rgba(255,255,255,.2);cursor:pointer;font-family:var(--font);padding:0}
.mem-clear:hover{color:var(--muted)}
</style>
</head>
<body>

<div class="topbar">
  <span class="topbar-title">🃏 大老二</span>
  <span class="topbar-sub">大富豪</span>
  <div class="topbar-spacer"></div>
  <span class="round-badge" id="round-badge">第 0 局</span>
  <span class="rev-badge" id="rev-badge">⚡ 革命中</span>
  <span class="save-badge" id="save-badge">💾 已儲存</span>
  <span class="online-badge" id="online-badge">⬤ <span id="online-count">—</span></span>
  <button class="topbar-btn" onclick="doRestart()">重開</button>
  <button class="topbar-btn" onclick="showRules()">規則</button>
</div>

<div class="app">
  <div class="table-wrap" id="table-wrap">
    <div class="ai-seat ai-top" data-area="ai-top" id="seat-2"></div>
    <div class="ai-seat" data-area="ai-left" id="seat-1"></div>
    <div class="center" id="center"></div>
    <div class="ai-seat" data-area="ai-right" id="seat-3"></div>
    <div class="human-area" id="human-area">
      <div class="hand-label">你的手牌</div>
      <div class="hand-cards-wrap">
        <div class="hand-cards" id="hand-cards"></div>
      </div>
    </div>
  </div>
  <div class="controls" id="controls"></div>
  <div class="log-panel">
    <div class="log-title">遊戲記錄</div>
    <div class="log-body" id="log-body"></div>
  </div>
</div>

<!-- 8-Cut announcement -->
<div class="cut-announce" id="cut-announce">
  <div class="cut-announce-box">
    <div class="cut-announce-icon">✂️</div>
    <div class="cut-announce-title">8-Cut！</div>
    <div class="cut-announce-sub">清場！同人繼續自由出牌</div>
    <div class="cut-announce-who" id="cut-ann-who"></div>
  </div>
</div>

<!-- Revolution announcement -->
<div class="rev-announce" id="rev-announce">
  <div class="rev-announce-box">
    <div class="rev-announce-icon" id="rev-ann-icon">⚡</div>
    <div class="rev-announce-title" id="rev-ann-title">革命！</div>
    <div class="rev-announce-sub" id="rev-ann-sub">牌力大逆轉　3 最大　2 最小</div>
    <div class="rev-announce-who" id="rev-ann-who"></div>
  </div>
</div>

<!-- Exchange overlay -->
<div class="overlay" id="overlay-exchange">
  <div class="overlay-box">
    <h3>卡牌交換</h3>
    <div id="exchange-content"></div>
    <button class="overlay-close" onclick="closeExchangeOverlay()">開始出牌</button>
  </div>
</div>

<!-- Round result overlay -->
<div class="overlay" id="overlay-result">
  <div class="overlay-box">
    <h3 id="result-title">本局結果</h3>
    <div class="results-grid" id="result-content"></div>
    <div class="mem-section" id="mem-stats"></div>
    <button class="overlay-close" onclick="nextRound()">下一局</button>
  </div>
</div>

<!-- Rules overlay -->
<div class="overlay" id="overlay-rules">
  <div class="overlay-box">
    <h3>規則說明</h3>
    <ul class="rules-list">
      <li>52 張牌，4 人各拿 13 張</li>
      <li>牌力大小：3 &lt; 4 &lt; … &lt; K &lt; A &lt; <b>2 最大</b></li>
      <li>花色：♣ &lt; ♦ &lt; ♥ &lt; ♠（同點比花色）</li>
      <li>可出：單張、對子、三條、五張組合（順子/同花/葫蘆/同花順）</li>
      <li>必須壓過上家，或跳過（Pass）</li>
      <li>全員 Pass → 最後出牌者自由出</li>
      <li>第一局：持有 ♣3 的人先出，且必須含 ♣3</li>
      <li><b>8-cut（日版）</b>：出含 8 的牌，清場，同人繼續</li>
      <li><b>革命（日版）</b>：出四條，牌力倒轉（2 變最小，3 最大），同人繼續</li>
      <li><b>卡牌交換（日版）</b>：大富豪收大貧民 2 張最大牌，給出 2 張最小牌；富豪收貧民 1 張，同理</li>
      <li>先出完手牌 = 大富豪，最後 = 大貧民</li>
    </ul>
    <button class="overlay-close" onclick="document.getElementById('overlay-rules').classList.remove('show')">關閉</button>
  </div>
</div>

<script>
'use strict';

// ── Constants ───────────────────────────────────────────────────────────
const SUIT_CHAR = ['♣','♦','♥','♠']; // index 0-3
const RED_SUIT = new Set([1,2]); // ♦♥

function dR(r){ return {11:'J',12:'Q',13:'K',14:'A',15:'2'}[r]||String(r) }
// Effective rank: normal 3=3..2=15; revolution reverses
function effR(r, rev){ return rev ? 18-r : r }

// ── AI Personalities ────────────────────────────────────────────────────
const PERSONAS = [
  {
    key:'aggressive', label:'火炮', color:'#d4145a',
    lines:['沒在怕的！','出！','大牌壓死你！','跑得掉嗎？','接著我的 2！',
           '逃不了啦！','再來一張！','革命是我的！','你們跟不上！','全壓！']
  },{
    key:'conservative', label:'穩重', color:'#2575fc',
    lines:['先跳過，等時機。','保留實力。','不急。','這手不值得出。','留著大牌。',
           '觀察一下。','讓你先出。','晚一點再說。','穩穩的。','等機會。']
  },{
    key:'veteran', label:'老手', color:'#219150',
    lines:['小牌先清。','局勢在我手。','算過了。','留兩張壓底。','早算好了。',
           '按計畫走。','別小看我。','這步棋值得。','你們太嫩了。','勝券在握。']
  },{
    key:'random', label:'瘋狂', color:'#e67e22',
    lines:['隨便！','反正都一樣啦！','哈！','丟！','管他的！',
           '就這張！','試試！','怎樣都行！','玩的就是心跳！','猜猜看！']
  }
];

const RANK_LABELS = { 0:'大富豪', 1:'富豪', 2:'平民', 3:'大貧民' };
const RANK_CSS   = { 0:'daifugou', 1:'fugou', 2:'heimin', 3:'daihinmin' };
const RANK_EMOJ  = { 0:'👑', 1:'💰', 2:'🧑', 3:'😢' };

// ── State ───────────────────────────────────────────────────────────────
let G = {
  players:[],           // 4 players: [0]=AI-left, [1]=human, [2]=AI-top, [3]=AI-right
  phase:'idle',         // idle|exchange|playing|round-end
  curPlayer:0,
  lastPlay:null,        // {playerIdx, cards, type, topEr, topS, str}
  lastPlayIdx:-1,
  passCount:0,
  revolution:false,
  roundNum:0,
  finishCount:0,        // how many have finished this round
  mustInclude3C:false,  // first play of game must include ♣3
  waitHuman:false,
  selected:[],          // indices into human.hand
  passList:[],          // names who passed on current play
};

// ── Deck ────────────────────────────────────────────────────────────────
function buildDeck(){
  const d=[];
  for(let s=0;s<4;s++) for(let r=3;r<=15;r++) d.push({r,s});
  // r: 3-10 normal, 11=J, 12=Q, 13=K, 14=A, 15=2 → 13 ranks × 4 suits = 52 ✓
  shuffle(d); return d;
}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=0|Math.random()*(i+1);[a[i],a[j]]=[a[j],a[i]]}}

function sortHand(hand, rev=false){
  return [...hand].sort((a,b)=>effR(a.r,rev)-effR(b.r,rev)||a.s-b.s);
}

// ── Hand Classification ──────────────────────────────────────────────────
// Returns null if invalid, else {type, count, topEr, topS, str (5-card only), cards}
function classifyPlay(cards, rev=false){
  if(!cards||!cards.length) return null;
  const n=cards.length;
  const sorted=sortHand(cards,rev);
  const rs=sorted.map(c=>c.r);
  const ers=sorted.map(c=>effR(c.r,rev));
  const ss=sorted.map(c=>c.s);

  if(n===1) return{type:'single',count:1,topEr:ers[0],topS:ss[0],cards:sorted};

  if(n===2){
    if(rs[0]!==rs[1]) return null;
    return{type:'pair',count:2,topEr:ers[0],topS:Math.max(ss[0],ss[1]),cards:sorted};
  }
  if(n===3){
    if(!rs.every(r=>r===rs[0])) return null;
    return{type:'triple',count:3,topEr:ers[0],topS:Math.max(...ss),cards:sorted};
  }
  if(n===4){
    if(!rs.every(r=>r===rs[0])) return null;
    return{type:'four',count:4,topEr:ers[0],topS:3,cards:sorted};
  }
  if(n===5) return classify5(sorted,ers,ss);
  return null;
}

function classify5(sorted,ers,ss){
  const erSort=[...ers].sort((a,b)=>a-b);
  const isFlush=ss.every(s=>s===ss[0]);
  const isStraight=new Set(erSort).size===5&&erSort[4]-erSort[0]===4;
  const rCnt={};
  for(const e of ers) rCnt[e]=(rCnt[e]||0)+1;
  const cnts=Object.values(rCnt).sort((a,b)=>b-a);
  const topEr=Math.max(...ers);
  const topS=Math.max(...ss);

  if(isFlush&&isStraight) return{type:'5',sub:'同花順',str:5,topEr,topS,count:5,cards:sorted};
  if(cnts[0]===4){
    const te=Number(Object.entries(rCnt).find(([,v])=>v===4)[0]);
    return{type:'5',sub:'四條',str:4,topEr:te,topS:3,count:5,cards:sorted};
  }
  if(cnts[0]===3&&cnts[1]===2){
    const te=Number(Object.entries(rCnt).find(([,v])=>v===3)[0]);
    return{type:'5',sub:'葫蘆',str:3,topEr:te,topS:3,count:5,cards:sorted};
  }
  if(isFlush) return{type:'5',sub:'同花',str:2,topEr,topS,count:5,cards:sorted};
  if(isStraight) return{type:'5',sub:'順子',str:1,topEr,topS,count:5,cards:sorted};
  return null;
}

function playLabel(play){
  if(!play) return '';
  const m={single:'單張',pair:'對子',triple:'三條',four:'四條'};
  if(play.type==='5') return play.sub;
  return m[play.type]||play.type;
}

function canBeat(newCards, lastPlay, rev=false){
  const np=classifyPlay(newCards,rev);
  if(!np) return false;
  if(!lastPlay) return true;

  // Four of a kind: beats singles/pairs/triples (special rule), triggers revolution
  if(np.type==='four'){
    if(lastPlay.type==='four') return np.topEr>lastPlay.topEr;
    if(lastPlay.type==='5') return false;
    return true; // beats 1/2/3
  }
  // 5-card only beats 5-card
  if(np.type==='5'&&lastPlay.type==='5'){
    if(np.str!==lastPlay.str) return np.str>lastPlay.str;
    if(np.topEr!==lastPlay.topEr) return np.topEr>lastPlay.topEr;
    return np.topS>lastPlay.topS;
  }
  if(np.type==='5') return false; // can't play 5-card on 1/2/3
  // Must match type
  if(np.type!==lastPlay.type) return false;
  if(np.topEr!==lastPlay.topEr) return np.topEr>lastPlay.topEr;
  return np.topS>lastPlay.topS;
}

// ── AI Logic ─────────────────────────────────────────────────────────────
function combinations(arr, k){
  if(k>arr.length||k<0) return [];
  if(k===0) return [[]];
  if(k===arr.length) return [arr];
  const [first,...rest]=arr;
  return [...combinations(rest,k-1).map(c=>[first,...c]),...combinations(rest,k)];
}

function findValidPlays(hand, lastPlay, rev){
  const plays=[];
  const n=lastPlay?lastPlay.count:0;

  if(!lastPlay){
    // Free play: enumerate reasonable starts
    // Singles
    for(const c of hand) plays.push([c]);
    // Pairs
    const pr=groupByR(hand);
    for(const cs of Object.values(pr)) if(cs.length>=2) plays.push(cs.slice(0,2));
    // Triples
    for(const cs of Object.values(pr)) if(cs.length>=3) plays.push(cs.slice(0,3));
    // Four of a kind
    for(const cs of Object.values(pr)) if(cs.length>=4) plays.push(cs.slice(0,4));
    // 5-card combos from hand (if hand small enough)
    if(hand.length<=8){
      for(const c of combinations(hand,5)){
        const p=classifyPlay(c,rev);
        if(p&&p.type==='5') plays.push(c);
      }
    }
    return plays;
  }

  // Must match or special-beat
  if(n===1||n===2||n===3){
    const pr=groupByR(hand);
    // Same type plays
    if(n===1) for(const c of hand){if(canBeat([c],lastPlay,rev))plays.push([c])}
    if(n===2) for(const cs of Object.values(pr)){if(cs.length>=2){const p=cs.slice(-2);if(canBeat(p,lastPlay,rev))plays.push(p)}}
    if(n===3) for(const cs of Object.values(pr)){if(cs.length>=3){const p=cs.slice(-3);if(canBeat(p,lastPlay,rev))plays.push(p)}}
    // Four of a kind can beat 1,2,3
    for(const cs of Object.values(pr)){if(cs.length>=4&&canBeat(cs,lastPlay,rev))plays.push(cs.slice(0,4))}
  }
  if(n===4){
    const pr=groupByR(hand);
    for(const cs of Object.values(pr)){if(cs.length>=4&&canBeat(cs,lastPlay,rev))plays.push(cs.slice(0,4))}
  }
  if(n===5){
    if(hand.length<=8){
      for(const c of combinations(hand,5)){if(canBeat(c,lastPlay,rev))plays.push(c)}
    } else {
      // Sample combos for large hands (performance)
      const sample=sampleCombinations(hand,5,200);
      for(const c of sample){if(canBeat(c,lastPlay,rev))plays.push(c)}
    }
  }
  return plays;
}

function groupByR(hand){
  const g={};
  for(const c of hand)(g[c.r]=g[c.r]||[]).push(c);
  for(const k in g) g[k].sort((a,b)=>a.s-b.s); // low suit first
  return g;
}

function sampleCombinations(arr, k, maxSample){
  const result=[];
  for(let i=0;i<maxSample;i++){
    const sample=[...arr].sort(()=>Math.random()-.5).slice(0,k);
    result.push(sample);
  }
  return result;
}

function weakestFirst(list, rev){
  return list.slice().sort((a,b)=>{
    const pa=classifyPlay(a,rev),pb=classifyPlay(b,rev);
    if(!pa||!pb) return 0;
    if(pa.topEr!==pb.topEr) return pa.topEr-pb.topEr;
    return (pa.topS||0)-(pb.topS||0);
  });
}

// 自由出牌：依人格決定想出哪種牌型
function aiChooseFreePlay(player){
  const rev=G.revolution;
  const hand=player.hand;
  const key=player.key;
  const pr=groupByR(hand);

  const singles=sortHand(hand,rev).map(c=>[c]);
  const pairs=Object.values(pr).filter(cs=>cs.length>=2).map(cs=>[cs[cs.length-2],cs[cs.length-1]]);
  const triples=Object.values(pr).filter(cs=>cs.length>=3).map(cs=>cs.slice(-3));
  const fours=Object.values(pr).filter(cs=>cs.length>=4).map(cs=>cs.slice(0,4));
  let fiveCard=[];
  if(hand.length<=9){
    for(const c of combinations(hand,5)){const p=classifyPlay(c,rev);if(p&&p.type==='5')fiveCard.push(c)}
  }

  // 依牌型優先排序候選 (weakest of each type)
  const weakPair=weakestFirst(pairs,rev)[0];
  const weakTriple=weakestFirst(triples,rev)[0];
  const weakSingle=singles[0];
  const bestFive=fiveCard.sort((a,b)=>{
    const pa=classifyPlay(a,rev),pb=classifyPlay(b,rev);
    if(!pa||!pb) return 0;
    return (pa.str||0)-(pb.str||0)||(pa.topEr-pb.topEr);
  })[0];

  const r=Math.random();

  if(key==='aggressive'){
    // 火炮：優先出對子/三條，快速清牌
    if(triples.length>0&&r<.2) return weakTriple;
    if(pairs.length>0&&r<.65) return weakPair;
    return weakSingle;
  }
  if(key==='veteran'){
    // 老手：手牌多對時優先出對，手牌少時考慮五張
    const pairRate=pairs.length/Math.max(1,hand.length/2);
    if(fiveCard.length>0&&hand.length<=7&&r<.25) return bestFive;
    if(triples.length>0&&r<.12) return weakTriple;
    if(pairs.length>0&&pairRate>=.4&&r<.55) return weakPair;
    if(pairs.length>0&&r<.35) return weakPair;
    return weakSingle;
  }
  if(key==='random'){
    const pool=[weakSingle,weakPair,weakTriple,bestFive].filter(Boolean);
    return pool[0|Math.random()*pool.length];
  }
  // conservative：主要出單，偶爾出對
  if(pairs.length>0&&r<.3) return weakPair;
  return weakSingle;
}

function aiChoosePlay(player){
  const rev=G.revolution;
  const lastPlay=G.lastPlay;
  const hand=player.hand;
  const key=player.key;

  // 自由出牌：獨立決策
  if(!lastPlay) return aiChooseFreePlay(player);

  // 跟牌：找同型可壓過的最弱出法
  const valids=findValidPlays(hand,lastPlay,rev);
  if(!valids.length) return null;

  const sorted=weakestFirst(valids,rev);

  if(key==='aggressive'&&Math.random()<.35) return sorted[sorted.length-1];
  if(key==='random') return sorted[0|Math.random()*sorted.length];
  if(key==='conservative'&&Math.random()<.2) return null; // 偶爾pass保留牌
  if(key==='veteran'&&hand.length<=5) return sorted[0]; // 手少了一定出
  return sorted[0];
}

// ── Table talk ───────────────────────────────────────────────────────────
function speak(player, chance=.25){
  if(!player||player.isHuman) return;
  const now=Date.now();
  if(now<(player.talkUntil||0)) return;
  if(Math.random()>chance) return;
  const p=PERSONAS.find(x=>x.key===player.key);
  if(!p) return;
  const line=p.lines[0|Math.random()*p.lines.length];
  player.talk=line; player.talkUntil=now+3000;
  setTimeout(()=>{player.talk='';renderAiSeats()},3000);
}

// ── Player setup ─────────────────────────────────────────────────────────
function initPlayers(){
  const perm=[...PERSONAS].sort(()=>Math.random()-.5);
  G.players=[
    mkP(0,'電腦甲',perm[0],false),
    mkP(1,'你',    null,    true),
    mkP(2,'電腦乙',perm[1],false),
    mkP(3,'電腦丙',perm[2],false),
  ];
}
function mkP(i,name,persona,isHuman){
  return{
    i,name,isHuman,
    key:persona?.key||'human',
    label:persona?.label||'',
    color:persona?.color||'rgba(255,255,255,.2)',
    hand:[],rank:null,finishOrder:-1,talk:'',talkUntil:0,
  };
}

// ── Game Flow ─────────────────────────────────────────────────────────────
function startGame(){
  G.roundNum=0;
  for(const p of G.players){ p.rank=null; p.finishOrder=-1; }
  startRound();
}

function startRound(){
  G.roundNum++;
  G.revolution=false;
  G.lastPlay=null;
  G.lastPlayIdx=-1;
  G.passCount=0;
  G.passList=[];
  G.finishCount=0;
  G.selected=[];
  G.waitHuman=false;
  document.getElementById('rev-badge').className='rev-badge';

  // Deal
  const deck=buildDeck();
  for(const p of G.players){
    p.hand=sortHand(deck.splice(0,13));
    p.finishOrder=-1;
    p.talk=''; p.talkUntil=0;
  }

  addLog('─── 第 '+G.roundNum+' 局 ───','sys');

  // Card exchange (round 2+)
  if(G.roundNum>1 && G.players.some(p=>p.rank!==null)){
    doCardExchange();
  } else {
    G.phase='playing';
    // Find ♣3 player
    G.mustInclude3C=true;
    const first=G.players.findIndex(p=>p.hand.some(c=>c.r===3&&c.s===0));
    G.curPlayer=first>=0?first:0;
    addLog('持有 ♣3 者先出','sys');
    render();
    startTurns();
  }
}

// ── Card Exchange ─────────────────────────────────────────────────────────
function doCardExchange(){
  // rank 0=大富豪, 1=富豪, 2=平民, 3=大貧民
  const byRank=(r)=>G.players.find(p=>p.rank===r);
  const daifugou=byRank(0), fugou=byRank(1), heimin=byRank(2), daihinmin=byRank(3);

  const exchangeInfo=[];

  if(daifugou&&daihinmin){
    // 大貧民 gives 2 best → 大富豪 gets them, gives back 2 worst
    const give=sortHand(daihinmin.hand,false).slice(-2); // 2 highest
    const giveBack=sortHand(daifugou.hand,false).slice(0,2); // 2 lowest
    exchangeInfo.push({from:daihinmin,to:daifugou,giveCards:give,getCards:giveBack});

    // Remove from daihinmin
    for(const c of give) removeCard(daihinmin.hand,c);
    for(const c of giveBack) removeCard(daifugou.hand,c);
    // Add to each other
    daihinmin.hand.push(...giveBack);
    daifugou.hand.push(...give);
    daihinmin.hand=sortHand(daihinmin.hand);
    daifugou.hand=sortHand(daifugou.hand);
  }

  if(fugou&&heimin){
    // 貧民 gives 1 best → 富豪 gets, gives back 1 worst
    const give=sortHand(heimin.hand,false).slice(-1);
    const giveBack=sortHand(fugou.hand,false).slice(0,1);
    exchangeInfo.push({from:heimin,to:fugou,giveCards:give,getCards:giveBack});

    for(const c of give) removeCard(heimin.hand,c);
    for(const c of giveBack) removeCard(fugou.hand,c);
    heimin.hand.push(...giveBack);
    fugou.hand.push(...give);
    heimin.hand=sortHand(heimin.hand);
    fugou.hand=sortHand(fugou.hand);
  }

  // Show exchange overlay
  showExchangeOverlay(exchangeInfo);
}

function removeCard(hand,card){
  const i=hand.findIndex(c=>c.r===card.r&&c.s===card.s);
  if(i>=0) hand.splice(i,1);
}

function showExchangeOverlay(info){
  const box=document.getElementById('exchange-content');
  box.innerHTML='';
  if(!info.length){box.innerHTML='<p style="font-size:.78rem;color:var(--muted)">無需交換</p>'}
  for(const ex of info){
    const row=document.createElement('div');
    row.className='exchange-row';
    row.innerHTML=`
      <span style="font-size:.75rem;flex:0 0 auto">${ex.from.name}（${ex.from.rank===3?'大貧民':'貧民'}）</span>
      <span class="ex-arrow">→</span>
      <span class="ex-cards">${ex.giveCards.map(c=>`<div class="ex-card-sm${RED_SUIT.has(c.s)?' red':''}">${dR(c.r)}<span style="font-size:.55rem">${SUIT_CHAR[c.s]}</span></div>`).join('')}</span>
      <span class="ex-arrow">→</span>
      <span style="font-size:.75rem;flex:0 0 auto">${ex.to.name}（${ex.to.rank===0?'大富豪':'富豪'}）</span>
    `;
    box.appendChild(row);
    addLog(`${ex.from.name} 給 ${ex.to.name} ${ex.giveCards.map(c=>dR(c.r)+SUIT_CHAR[c.s]).join(' ')}`, 'hi');
  }
  document.getElementById('overlay-exchange').classList.add('show');
}

function closeExchangeOverlay(){
  document.getElementById('overlay-exchange').classList.remove('show');
  G.phase='playing';
  G.mustInclude3C=false;
  // 大貧民 goes first in next rounds
  const daihinmin=G.players.find(p=>p.rank===3);
  G.curPlayer=daihinmin?daihinmin.i:0;
  addLog((daihinmin||G.players[0]).name+' 先出','sys');
  render();
  startTurns();
}

// ── Turn Processing ───────────────────────────────────────────────────────
async function startTurns(){
  await processTurn();
}

async function processTurn(){
  if(G.phase!=='playing') return;

  const p=G.players[G.curPlayer];
  if(p.finishOrder!==-1){
    advance(); await gd(100); await processTurn(); return;
  }

  const actives=G.players.filter(x=>x.finishOrder===-1);

  if(p.isHuman){
    G.waitHuman=true; render(); return;
  }

  G.waitHuman=false; render();
  await gd(700);

  const choice=aiChoosePlay(p);
  if(!choice){
    G.passCount++;
    G.passList.push(p.name);
    addLog(p.name+'：跳過');
    speak(p,.2);
    render();

    if(G.lastPlay&&G.passCount>=actives.length-1){
      await clearTable(G.lastPlayIdx);
      return;
    }
    advance(); await gd(300); await processTurn();
  } else {
    await executePlay(G.curPlayer, choice);
  }
}

async function executePlay(playerIdx, cards){
  const p=G.players[playerIdx];
  const play=classifyPlay(cards, G.revolution);
  if(!play) return;

  // Remove cards from hand
  for(const c of cards) removeCard(p.hand,c);
  p.hand=sortHand(p.hand, G.revolution);

  const was8=cards.some(c=>c.r===8);
  const isFour=play.type==='four';

  G.mustInclude3C=false; // 第一手已出，清除限制
  G.lastPlay=play;
  G.lastPlayIdx=playerIdx;
  G.passCount=0;
  G.passList=[];

  addLog(`${p.name}：${playLabel(play)}（${cards.map(c=>dR(c.r)+SUIT_CHAR[c.s]).join(' ')})`,'hi');
  speak(p,.3);
  render();
  await gd(400);

  // Win check
  if(p.hand.length===0){
    p.finishOrder=G.finishCount++;
    addLog(`${p.name} 出完牌！${RANK_EMOJ[p.finishOrder]}`,'good');
    const remaining=G.players.filter(x=>x.finishOrder===-1);
    if(remaining.length<=1){
      if(remaining.length===1){ remaining[0].finishOrder=G.finishCount++; }
      await gd(600);
      endRound(); return;
    }
    // Player finished but game continues — clear board so next player plays freely
    G.lastPlay=null; G.passCount=0; G.passList=[];
  }

  // 8-cut
  if(was8){
    G.lastPlay=null; G.passCount=0; G.passList=[];
    addLog('8-cut！'+p.name+' 繼續自由出牌','rev');
    render(); await show8Cut(p.name);
    // Same player continues (if still active)
    if(p.finishOrder!==-1){ advance(); }
    await processTurn(); return;
  }

  // Revolution
  if(isFour){
    G.revolution=!G.revolution;
    G.lastPlay=null; G.passCount=0; G.passList=[];
    addLog((G.revolution?'⚡ 革命！':'⚡ 反革命！')+' 牌力大逆轉','rev');
    document.getElementById('rev-badge').className='rev-badge'+(G.revolution?' on':'');
    for(const pl of G.players) pl.hand=sortHand(pl.hand,G.revolution);
    render();
    await showRevAnnounce(G.revolution, p.name);
    if(p.finishOrder!==-1){ advance(); }
    await processTurn(); return;
  }

  advance();
  await gd(200);
  await processTurn();
}

async function clearTable(lastPlayIdx){
  G.lastPlay=null; G.passCount=0; G.passList=[];
  const name=G.players[lastPlayIdx].name;
  addLog('全員跳過，'+name+' 自由出牌','sys');
  G.curPlayer=lastPlayIdx;
  // Skip if finished
  if(G.players[lastPlayIdx].finishOrder!==-1) advance();
  render();
  await gd(300);
  await processTurn();
}

function advance(){
  let n=G.curPlayer;
  for(let i=0;i<4;i++){
    n=(n+1)%4;
    if(G.players[n].finishOrder===-1){ G.curPlayer=n; return; }
  }
}

// Human actions
async function humanPlay(){
  if(!G.waitHuman) return;
  const h=human();
  const selCards=G.selected.map(i=>h.hand[i]);

  if(G.mustInclude3C){
    if(!selCards.some(c=>c.r===3&&c.s===0)){
      setHint('第一手必須包含 ♣3！'); return;
    }
  }

  if(!canBeat(selCards, G.lastPlay, G.revolution)){
    setHint('無效出牌：無法壓過上家'); return;
  }

  G.selected=[];
  G.mustInclude3C=false;
  G.waitHuman=false;
  await executePlay(h.i, selCards);
}

async function humanPass(){
  if(!G.waitHuman) return;
  if(!G.lastPlay){ setHint('自由出牌時不能跳過'); return; }
  if(G.mustInclude3C){ setHint('第一手必須出牌（含 ♣3）'); return; }
  const h=human();
  G.passCount++; G.passList.push(h.name);
  addLog('你：跳過');
  G.selected=[];
  G.waitHuman=false;
  const actives=G.players.filter(p=>p.finishOrder===-1);
  if(G.passCount>=actives.length-1&&G.lastPlay){
    render(); await sl(200);
    await clearTable(G.lastPlayIdx); return;
  }
  advance(); render(); await sl(200); await processTurn();
}

function toggleSelect(idx){
  if(!G.waitHuman) return;
  const h=human();
  // Locked ♣3 in first play
  if(G.mustInclude3C){
    const c=h.hand[idx];
    if(c.r===3&&c.s===0) return; // can't deselect ♣3
  }
  const pos=G.selected.indexOf(idx);
  if(pos>=0) G.selected.splice(pos,1);
  else G.selected.push(idx);
  renderHumanHand(); renderControls();
}

// ── Round End ─────────────────────────────────────────────────────────────
function endRound(){
  clearSave();
  G.phase='round-end';
  for(const p of G.players){
    p.rank=p.finishOrder>=0?p.finishOrder:3;
  }
  const h=human();
  if(h) recordRound(h.rank);
  addLog('本局結束','sys');
  showResultOverlay();
  render();
}

function showResultOverlay(){
  const sorted=[...G.players].sort((a,b)=>a.rank-b.rank);
  const title=document.getElementById('result-title');
  title.textContent='第 '+G.roundNum+' 局結果';
  const box=document.getElementById('result-content');
  box.innerHTML='';
  for(const p of sorted){
    const row=document.createElement('div');
    row.className='result-row';
    row.innerHTML=`
      <span class="result-rank">${RANK_EMOJ[p.rank]}</span>
      <span class="result-name">${p.name}</span>
      <span class="result-label rank-tag ${RANK_CSS[p.rank]}">${RANK_LABELS[p.rank]}</span>
    `;
    box.appendChild(row);
  }
  document.getElementById('overlay-result').classList.add('show');
  renderMemStats();
}

function nextRound(){
  document.getElementById('overlay-result').classList.remove('show');
  startRound();
}

// ── Memory (cumulative stats) ─────────────────────────────────────────────
const MEM_KEY='big2_memory';
const MEM_BAR_COLOR=['#f2b84b','#60a5fa','#9ca3af','#f87171']; // gold/blue/grey/red

function loadMemory(){
  try{
    const raw=localStorage.getItem(MEM_KEY);
    if(raw){const m=JSON.parse(raw);if(m.v===1)return m;}
  }catch(e){}
  return{v:1,rounds:0,ranks:[0,0,0,0],streak:0,best:0};
}

function recordRound(humanRank){
  const m=loadMemory();
  m.rounds++;
  m.ranks[humanRank]=(m.ranks[humanRank]||0)+1;
  m.streak=humanRank===0?m.streak+1:0;
  if(m.streak>m.best) m.best=m.streak;
  try{localStorage.setItem(MEM_KEY,JSON.stringify(m));}catch(e){}
}

function clearMemory(){
  if(!confirm('確定清除所有戰績記錄？')) return;
  try{localStorage.removeItem(MEM_KEY);}catch(e){}
  renderMemStats();
}

function renderMemStats(){
  const box=document.getElementById('mem-stats');
  if(!box) return;
  const m=loadMemory();
  const labels=['👑 大富豪','💰 富豪','🧑 平民','😢 大貧民'];
  box.innerHTML='';

  const title=document.createElement('div');
  title.className='mem-title';
  title.textContent='你的累計戰績（共 '+m.rounds+' 局）';
  box.appendChild(title);

  if(m.rounds===0){
    const empty=document.createElement('div');
    empty.style.cssText='font-size:.72rem;color:var(--muted);text-align:center;padding:4px 0';
    empty.textContent='尚無記錄';
    box.appendChild(empty);
    return;
  }

  const grid=document.createElement('div');
  grid.className='mem-ranks';
  for(let i=0;i<4;i++){
    const cnt=m.ranks[i]||0;
    const pct=m.rounds?Math.round(cnt/m.rounds*100):0;
    const row=document.createElement('div');
    row.className='mem-rank-row';
    row.innerHTML=`<span style="min-width:60px">${labels[i]}</span>
      <div class="mem-rank-bar-wrap"><div class="mem-rank-bar" style="width:${pct}%;background:${MEM_BAR_COLOR[i]}"></div></div>
      <span class="mem-rank-count">${cnt}次</span>`;
    grid.appendChild(row);
  }
  box.appendChild(grid);

  const footer=document.createElement('div');
  footer.className='mem-footer';
  const streakEl=document.createElement('span');
  streakEl.innerHTML=m.streak>1?`<span class="mem-streak">連勝 ${m.streak} 場</span>`
    :(m.best>1?`最佳連勝 ${m.best} 場`:'');
  const clearBtn=document.createElement('button');
  clearBtn.className='mem-clear';clearBtn.textContent='清除記錄';
  clearBtn.onclick=clearMemory;
  footer.appendChild(streakEl);footer.appendChild(clearBtn);
  box.appendChild(footer);
}

// ── Auto-Save ─────────────────────────────────────────────────────────────
const SAVE_KEY='big2_autosave';

function saveGame(){
  if(G.phase!=='playing'||!G.waitHuman) return;
  const state={
    v:1,
    players:G.players.map(p=>({
      i:p.i,name:p.name,isHuman:p.isHuman,
      key:p.key,label:p.label,color:p.color,
      hand:p.hand,rank:p.rank,finishOrder:p.finishOrder,
    })),
    phase:G.phase,curPlayer:G.curPlayer,
    lastPlay:G.lastPlay,lastPlayIdx:G.lastPlayIdx,
    passCount:G.passCount,revolution:G.revolution,
    roundNum:G.roundNum,finishCount:G.finishCount,
    mustInclude3C:G.mustInclude3C,passList:G.passList,
  };
  try{
    localStorage.setItem(SAVE_KEY,JSON.stringify(state));
    const b=document.getElementById('save-badge');
    if(b){b.classList.add('show');clearTimeout(b._t);b._t=setTimeout(()=>b.classList.remove('show'),1800);}
  }catch(e){}
}

function loadGame(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(!raw) return false;
    const s=JSON.parse(raw);
    if(s.v!==1||s.phase!=='playing') return false;
    // Restore non-function fields
    G.players=s.players.map(p=>({...p,talk:'',talkUntil:0}));
    G.phase=s.phase; G.curPlayer=s.curPlayer;
    G.lastPlay=s.lastPlay; G.lastPlayIdx=s.lastPlayIdx;
    G.passCount=s.passCount; G.revolution=s.revolution;
    G.roundNum=s.roundNum; G.finishCount=s.finishCount;
    G.mustInclude3C=s.mustInclude3C; G.passList=s.passList;
    G.selected=[]; G.waitHuman=true;
    document.getElementById('rev-badge').className='rev-badge'+(G.revolution?' on':'');
    render();
    addLog('── 已還原上次存檔 ──','sys');
    return true;
  }catch(e){ return false; }
}

function clearSave(){
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
}

// ── Helpers ───────────────────────────────────────────────────────────────
const sl=ms=>new Promise(r=>setTimeout(r,ms));
// 人類出完後切快速模式（80ms），否則用正常延遲
const gd=ms=>sl(human()?.finishOrder!==-1?80:ms);

function show8Cut(who){
  const el=document.getElementById('cut-announce');
  document.getElementById('cut-ann-who').textContent=who+' 出了含 8 的牌';
  el.classList.add('show');
  return new Promise(r=>setTimeout(()=>{el.classList.remove('show');r()},1400));
}

function nextActive(){
  let n=G.curPlayer;
  for(let i=0;i<4;i++){ n=(n+1)%4; if(G.players[n].finishOrder===-1) return G.players[n]; }
  return null;
}

function showRevAnnounce(isRev, who){
  const el=document.getElementById('rev-announce');
  document.getElementById('rev-ann-icon').textContent=isRev?'⚡':'🔄';
  document.getElementById('rev-ann-title').textContent=isRev?'革命！':'反革命！';
  document.getElementById('rev-ann-sub').textContent=isRev?'牌力大逆轉　3 最大　2 最小':'恢復正常　2 最大　3 最小';
  document.getElementById('rev-ann-who').textContent=who+' 出了四條';
  el.classList.add('show');
  return new Promise(r=>setTimeout(()=>{el.classList.remove('show');r()},1600));
}
const human=()=>G.players.find(p=>p.isHuman);

function setHint(msg){
  const el=document.getElementById('play-hint');
  if(el){ el.textContent=msg; setTimeout(()=>{if(el)el.textContent=''},2000); }
}

function addLog(msg,cls=''){
  const body=document.getElementById('log-body');
  if(!body) return;
  const el=document.createElement('div');
  el.className='le'+(cls?' '+cls:''); el.textContent=msg;
  body.appendChild(el); body.scrollTop=body.scrollHeight;
}

// ── Render ────────────────────────────────────────────────────────────────
function renderCard(c, small=false){
  const el=document.createElement('div');
  el.className='card face-up'+(RED_SUIT.has(c.s)?' red':'');
  el.innerHTML=`<span class="card-rank">${dR(c.r)}</span><span class="card-suit">${SUIT_CHAR[c.s]}</span>`;
  if(small){ el.style.width='30px'; el.style.height='44px'; }
  return el;
}

function renderAiSeats(){
  const seats=[
    {id:'seat-1',pidx:0}, // AI-left
    {id:'seat-2',pidx:2}, // AI-top
    {id:'seat-3',pidx:3}, // AI-right
  ];
  for(const {id,pidx} of seats){
    const el=document.getElementById(id);
    if(!el) continue;
    const p=G.players[pidx];
    const isActive=G.phase==='playing'&&G.curPlayer===pidx&&p.finishOrder===-1;
    const isDone=p.finishOrder!==-1;
    el.className='ai-seat'+(id==='seat-2'?' ai-top':'')+(isActive?' active':'')+(isDone?' done':'');

    el.innerHTML='';

    // Table talk
    if(p.talk){
      const tb=document.createElement('div');
      tb.className='table-talk'; tb.textContent=p.talk; el.appendChild(tb);
    }

    // Avatar
    const av=document.createElement('div');
    av.className='ai-avatar';
    av.style.background=p.color+'33'; av.style.borderColor=p.color;
    av.textContent=p.name.slice(-1); el.appendChild(av);

    // Name row
    const nm=document.createElement('div');
    nm.className='ai-name'; nm.textContent=p.name; el.appendChild(nm);

    // Personality + rank
    const row=document.createElement('div');
    row.style.cssText='display:flex;gap:4px;flex-wrap:wrap;justify-content:center';
    if(p.label){const pe=document.createElement('div');pe.className='personality';pe.textContent=p.label;row.appendChild(pe)}
    if(p.rank!==null){const rt=document.createElement('div');rt.className=`rank-tag ${RANK_CSS[p.rank]}`;rt.textContent=RANK_LABELS[p.rank];row.appendChild(rt)}
    el.appendChild(row);

    // Face-down cards (visual)
    const show=Math.min(p.hand.length,5);
    if(show>0){
      const cardsEl=document.createElement('div');
      cardsEl.className='ai-cards';
      for(let i=0;i<show;i++){
        const bc=document.createElement('div');bc.className='back-card';cardsEl.appendChild(bc);
      }
      el.appendChild(cardsEl);
    }

    // Card count
    const cnt=document.createElement('div');
    cnt.className='ai-card-count';
    cnt.textContent=isDone?RANK_EMOJ[p.finishOrder]+'完成':p.hand.length+'張';
    el.appendChild(cnt);
  }
}

function renderCenter(){
  const el=document.getElementById('center');
  if(!el) return;
  el.innerHTML='<div class="center-label">場上最後一手</div>';

  if(G.lastPlay){
    const who=document.createElement('div');
    who.className='center-who';
    who.textContent=G.players[G.lastPlayIdx].name+' 出了';
    el.appendChild(who);

    const type=document.createElement('div');
    type.className='center-type'; type.textContent=playLabel(G.lastPlay);
    el.appendChild(type);

    const cards=document.createElement('div');
    cards.className='center-cards';
    for(const c of G.lastPlay.cards) cards.appendChild(renderCard(c,true));
    el.appendChild(cards);
  } else {
    const hint=document.createElement('div');
    hint.className='free-play-hint';
    hint.textContent=G.phase==='playing'?'自由出牌':'—';
    el.appendChild(hint);
  }

  // Pass list
  if(G.passList.length){
    const pb=document.createElement('div');
    pb.className='pass-badges';
    for(const name of G.passList){
      const badge=document.createElement('div');
      badge.className='pass-badge'; badge.textContent=name+' 跳過';
      pb.appendChild(badge);
    }
    el.appendChild(pb);
  }

  // Turn indicator
  if(G.phase==='playing'){
    const cur=G.players[G.curPlayer];
    const nxt=nextActive();
    const ti=document.createElement('div');
    ti.className='turn-info';
    const curName=cur.isHuman?'你':cur.name;
    const nxtName=nxt?(nxt.isHuman?'你':nxt.name):null;
    ti.innerHTML=`<span class="turn-cur">▶ ${curName}</span>`+
      (nxtName?`<span class="turn-sep">›</span><span class="turn-next">下一位 ${nxtName}</span>`:'');
    el.appendChild(ti);
  }
}

function renderHumanHand(){
  const h=human();
  const container=document.getElementById('hand-cards');
  if(!container) return;
  container.innerHTML='';

  const rev=G.revolution;
  // ♣3 index in hand
  const lock3C=G.mustInclude3C?h.hand.findIndex(c=>c.r===3&&c.s===0):-1;
  if(G.waitHuman&&lock3C>=0&&!G.selected.includes(lock3C)){
    G.selected.push(lock3C);
  }

  h.hand.forEach((c,i)=>{
    const el=document.createElement('div');
    const isSel=G.selected.includes(i);
    const isLocked=lock3C===i;
    el.className='hand-card'+(RED_SUIT.has(c.s)?' red':'')+(isSel?' selected':'')+(isLocked?' locked':'');
    el.innerHTML=`<span class="card-rank">${dR(c.r)}</span><span class="card-suit">${SUIT_CHAR[c.s]}</span>`;
    el.onclick=()=>toggleSelect(i);
    container.appendChild(el);
  });

  // hint about effective rank in revolution
  const ha=document.getElementById('human-area');
  if(ha){
    let lbl=ha.querySelector('.hand-label');
    if(!lbl){lbl=document.createElement('div');lbl.className='hand-label';ha.prepend(lbl)}
    lbl.textContent=rev?'你的手牌（革命中：3最大）':'你的手牌';
  }
}

function renderControls(){
  const ctrl=document.getElementById('controls');
  if(!ctrl) return;
  ctrl.innerHTML='';

  if(G.phase==='idle'){
    const b=document.createElement('button');b.className='btn-main';b.textContent='開始遊戲';
    b.onclick=()=>{initPlayers();startGame()};ctrl.appendChild(b); return;
  }
  if(G.phase==='round-end'||G.phase==='exchange'){
    const info=document.createElement('div');info.className='phase-info';
    info.textContent=G.phase==='exchange'?'卡牌交換中…':'本局結束';
    ctrl.appendChild(info); return;
  }
  if(G.phase==='playing'){
    const h=human();
    const selCards=G.selected.map(i=>h.hand[i]);
    const playValid=G.waitHuman&&selCards.length>0&&canBeat(selCards,G.lastPlay,G.revolution)
      &&(!G.mustInclude3C||selCards.some(c=>c.r===3&&c.s===0));
    const passOk=G.waitHuman&&!!G.lastPlay&&!G.mustInclude3C;

    // Play type hint
    const play=selCards.length?classifyPlay(selCards,G.revolution):null;
    const hintText=play?playLabel(play)+(G.waitHuman?(canBeat(selCards,G.lastPlay,G.revolution)?'（可出）':'（無法壓過）'):''):'選擇手牌出牌';

    const hint=document.createElement('div');
    hint.id='play-hint'; hint.className='play-hint'; hint.textContent=hintText;
    ctrl.appendChild(hint);

    const row=document.createElement('div');row.className='ctrl-row';

    const pb=document.createElement('button');pb.className='btn-play';
    pb.textContent=selCards.length?`出牌（${selCards.length}張）`:'出牌';
    pb.disabled=!playValid; pb.onclick=humanPlay;

    const psBtn=document.createElement('button');psBtn.className='btn-pass';
    psBtn.textContent='跳過'; psBtn.disabled=!passOk; psBtn.onclick=humanPass;

    row.appendChild(pb); row.appendChild(psBtn);
    ctrl.appendChild(row);

    if(!G.waitHuman){
      const inf=document.createElement('div');inf.className='phase-info';
      inf.textContent='等待其他玩家…';ctrl.appendChild(inf);
    }
  }
}

function render(){
  const rb=document.getElementById('round-badge');
  if(rb) rb.textContent='第 '+G.roundNum+' 局';
  renderAiSeats();
  renderCenter();
  renderHumanHand();
  renderControls();
  saveGame();
}

function doRestart(){
  const safe=['idle','round-end'];
  if(!safe.includes(G.phase)&&!confirm('確定重新開局？本局將放棄。')) return;
  clearSave();
  G.phase='idle';
  G.revolution=false;
  document.getElementById('rev-badge').className='rev-badge';
  document.getElementById('overlay-result').classList.remove('show');
  document.getElementById('overlay-exchange').classList.remove('show');
  document.getElementById('log-body').innerHTML='';
  initPlayers();
  G.roundNum=0;
  G.selected=[];
  render();
  addLog('重新開局','sys');
}

function showRules(){ document.getElementById('overlay-rules').classList.add('show') }

// ── Presence ──────────────────────────────────────────────────────────────
(function(){
  const APP='big-two';
  const URL='/api/presence.php';
  let id=null;
  try{
    id=sessionStorage.getItem('big_two_pid');
    if(!id){id=Array.from({length:16},()=>'0123456789abcdef'[0|Math.random()*16]).join('');sessionStorage.setItem('big_two_pid',id);}
  }catch(e){id=Math.random().toString(36).slice(2)}

  function ping(){
    fetch(`${URL}?app=${encodeURIComponent(APP)}&id=${encodeURIComponent(id)}`,{cache:'no-store'})
      .then(r=>r.json())
      .then(d=>{
        const el=document.getElementById('online-count');
        if(el) el.textContent=Number.isFinite(d?.online)?d.online+' 人在線':'—';
      })
      .catch(()=>{const el=document.getElementById('online-count');if(el)el.textContent='—'});
  }
  ping();
  setInterval(ping,10000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)ping()});
})();

// ── Boot ──────────────────────────────────────────────────────────────────
window.addEventListener('load',()=>{
  initPlayers();
  G.phase='idle';
  if(!loadGame()){
    render();
    addLog('歡迎來到大老二・大富豪！','sys');
    addLog('點擊「開始遊戲」開始。','sys');
  }
});
</script>
</body>
</html>
