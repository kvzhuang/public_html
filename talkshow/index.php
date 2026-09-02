<?php header('Cache-Control: no-cache'); ?><!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>📻 相聲電台 — Talkshow Radio</title>
<meta name="description" content="線上相聲電台：依作家、作品瀏覽點播，連續收聽相聲瓦舍、表演工作坊、吳兆南＆魏龍豪、費玉清等經典段子。">
<meta name="theme-color" content="#1c140d">
<style>
  :root{
    --bg:#1c140d; --panel:#271b10; --panel2:#2f2114;
    --line:#4a3720; --txt:#f0e6d2; --dim:#b7a281; --gold:#e8b24a; --hot:#e0623a;
  }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:
    radial-gradient(1200px 500px at 50% -10%, #35241400, #35241455 40%, transparent),
    var(--bg); color:var(--txt);
    font-family:-apple-system,"Noto Sans TC",sans-serif; min-height:100vh}
  a{color:inherit}
  header{padding:18px 16px 10px; text-align:center}
  h1{margin:0; font-size:1.7rem; letter-spacing:.05em}
  h1 .em{filter:drop-shadow(0 0 8px rgba(232,178,74,.5))}
  .sub{color:var(--dim); font-size:.85rem; margin-top:4px}
  .live{margin:8px auto 0; display:inline-flex; align-items:center; gap:7px; font-size:.85rem;
    color:#ffd9a0; background:rgba(224,98,58,.16); border:1px solid rgba(224,98,58,.4);
    border-radius:16px; padding:4px 13px}
  .live .dot{width:8px; height:8px; border-radius:50%; background:#42d778;
    box-shadow:0 0 0 0 rgba(66,215,120,.6); animation:pulse 1.8s infinite}
  @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(66,215,120,.5)}
    70%{box-shadow:0 0 0 7px rgba(66,215,120,0)}100%{box-shadow:0 0 0 0 rgba(66,215,120,0)}}
  .cta{margin:12px auto 0; display:flex; gap:10px; justify-content:center; flex-wrap:wrap}
  .btn{background:linear-gradient(135deg,var(--hot),#c94a28); color:#fff; border:none;
    border-radius:22px; padding:10px 20px; font-weight:700; font-size:.95rem; cursor:pointer;
    box-shadow:0 4px 16px rgba(224,98,58,.4)}
  .btn.ghost{background:var(--panel2); color:var(--gold); box-shadow:none; border:1px solid var(--line)}
  .tabs{display:flex; gap:8px; justify-content:center; margin:14px 0 6px}
  .tab{background:var(--panel); border:1px solid var(--line); color:var(--dim);
    border-radius:18px; padding:6px 16px; cursor:pointer; font-size:.9rem}
  .tab.on{background:var(--gold); color:#3a2a12; font-weight:700; border-color:var(--gold)}
  main{max-width:1100px; margin:0 auto; padding:6px 14px 150px; display:grid;
    grid-template-columns:minmax(260px,1fr) minmax(300px,1.3fr); gap:16px}
  @media(max-width:760px){ main{grid-template-columns:1fr} }
  .col h2{font-size:1rem; color:var(--gold); margin:8px 4px}
  .card{background:var(--panel); border:1px solid var(--line); border-radius:12px; overflow:hidden}
  .art{padding:11px 14px; border-top:1px solid #3a2c1a; cursor:pointer; display:flex;
    align-items:center; gap:10px}
  .art:first-child{border-top:none}
  .art:hover{background:var(--panel2)}
  .art .nm{font-weight:600}
  .art .ct{margin-left:auto; color:var(--dim); font-size:.8rem}
  .albs{padding:2px 0 6px 12px; background:#20160c}
  .alb{padding:8px 14px; cursor:pointer; display:flex; align-items:center; gap:8px; color:var(--dim)}
  .alb:hover{color:var(--txt)}
  .alb .ab{color:var(--txt)}
  .alb .ct{margin-left:auto; font-size:.78rem}
  .grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:10px}
  .acard{background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:12px;
    cursor:pointer; transition:transform .12s, box-shadow .12s}
  .acard:hover{transform:translateY(-2px); box-shadow:0 8px 22px rgba(0,0,0,.4); border-color:var(--gold)}
  .acard .disc{font-size:1.8rem}
  .acard .ab{font-weight:700; margin-top:6px; line-height:1.3}
  .acard .meta{color:var(--dim); font-size:.78rem; margin-top:4px}
  .pl-hd{display:flex; align-items:center; gap:8px; margin:8px 4px}
  .pl-hd .ttl{font-weight:700}
  .pl-hd .sub{color:var(--dim); font-size:.8rem}
  .tr{padding:9px 12px; border-top:1px dashed #3a2c1a; cursor:pointer; display:flex;
    align-items:center; gap:10px}
  .tr:first-child{border-top:none}
  .tr:hover{background:var(--panel2)}
  .tr.playing{background:#3a2913}
  .tr .no{color:var(--dim); width:24px; text-align:right; font-variant-numeric:tabular-nums}
  .tr.playing .no{color:var(--hot)}
  .tr .tt{flex:1}
  .tr .du{color:var(--dim); font-size:.8rem; font-variant-numeric:tabular-nums}
  .empty{color:var(--dim); padding:26px; text-align:center}
  /* 播放器 */
  #player{position:fixed; left:0; right:0; bottom:0; background:linear-gradient(180deg,#2a1d10,#20160c);
    border-top:1px solid var(--line); box-shadow:0 -8px 30px rgba(0,0,0,.5); z-index:40}
  .pwrap{max-width:1100px; margin:0 auto; padding:10px 14px; display:flex; align-items:center; gap:14px}
  .pnow{min-width:0; flex:1}
  .pnow .pt{font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
  .pnow .pa{color:var(--dim); font-size:.8rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
  .ctrls{display:flex; align-items:center; gap:6px}
  .ico{background:none; border:none; color:var(--txt); font-size:1.15rem; cursor:pointer; padding:6px}
  .ico.big{font-size:1.7rem; color:var(--gold)}
  .ico.on{color:var(--hot)}
  .bar{flex:2; display:flex; align-items:center; gap:8px; min-width:120px}
  .bar .t{color:var(--dim); font-size:.72rem; font-variant-numeric:tabular-nums; width:38px; text-align:center}
  .seek{flex:1; height:6px; background:#4a3720; border-radius:4px; position:relative; cursor:pointer}
  .seek .fill{position:absolute; left:0; top:0; bottom:0; background:var(--gold); border-radius:4px; width:0}
  @media(max-width:620px){ .bar{order:5; flex-basis:100%} .pwrap{flex-wrap:wrap} }
</style>
</head>
<body>
  <header>
    <h1><span class="em">📻</span> 相聲電台</h1>
    <div class="sub" id="sub">載入中…</div>
    <div class="live" id="listeners" style="display:none"></div>
    <div class="cta">
      <button class="btn" id="randomAll">▶ 隨機開始收聽</button>
      <button class="btn ghost" id="shuffleArtist">🎲 手氣不錯</button>
    </div>
    <div class="tabs">
      <div class="tab on" data-view="artist">依作家</div>
      <div class="tab" data-view="album">依作品</div>
    </div>
  </header>

  <main>
    <div class="col">
      <h2 id="browseTitle">作家</h2>
      <div id="browse"></div>
    </div>
    <div class="col">
      <div class="pl-hd"><span class="ttl" id="plTitle">播放清單</span>
        <span class="sub" id="plSub"></span></div>
      <div class="card"><div id="playlist"><div class="empty">從左邊挑一部作品，或按「▶ 隨機開始收聽」。</div></div></div>
    </div>
  </main>

  <div id="player">
    <div class="pwrap">
      <div class="ctrls">
        <button class="ico" id="prev" title="上一段">⏮</button>
        <button class="ico big" id="play" title="播放/暫停">▶</button>
        <button class="ico" id="next" title="下一段">⏭</button>
      </div>
      <div class="pnow">
        <div class="pt" id="npTitle">尚未播放</div>
        <div class="pa" id="npArtist">相聲電台</div>
      </div>
      <div class="bar">
        <span class="t" id="cur">0:00</span>
        <div class="seek" id="seek"><div class="fill" id="fill"></div></div>
        <span class="t" id="dur">0:00</span>
      </div>
      <div class="ctrls">
        <button class="ico" id="shuffle" title="隨機">🔀</button>
        <button class="ico" id="repeat" title="循環">🔁</button>
      </div>
      <audio id="audio" preload="none"></audio>
    </div>
  </div>

  <script src="app.js?v=<?php echo time(); ?>"></script>
</body>
</html>
