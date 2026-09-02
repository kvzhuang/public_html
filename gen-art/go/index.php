<?php $title = "圍棋 Go"; ?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title><?=$title?></title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@300;400;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #1a0f0a;
      color: #f0e8d0;
      font-family: 'Noto Serif TC', serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      padding: 20px 16px 40px;
    }

    h1 {
      font-size: 2rem;
      margin-bottom: 14px;
      letter-spacing: 0.12em;
      text-align: center;
    }

    h1 span {
      font-size: 1.2rem;
      color: #c8a96e;
      margin-left: 10px;
      letter-spacing: 0.08em;
    }

    #app {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      width: 100%;
      max-width: 720px;
    }

    canvas {
      border-radius: 6px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5);
      cursor: pointer;
      touch-action: none;
      display: block;
    }

    #info {
      width: 100%;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(200,169,110,0.2);
      border-radius: 8px;
      padding: 12px 18px;
      font-size: 0.95rem;
      line-height: 1.8;
      min-height: 60px;
      text-align: center;
      color: #e8dcc8;
    }

    #info .score-detail {
      font-size: 0.88rem;
      color: #c8a96e;
      margin-top: 6px;
    }

    #info .winner {
      font-size: 1.2rem;
      font-weight: 600;
      color: #f4c842;
      margin-bottom: 4px;
    }

    #btns {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      width: 100%;
    }

    button {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(200,169,110,0.35);
      color: #e8dcc8;
      border-radius: 6px;
      padding: 8px 16px;
      font-family: 'Noto Serif TC', serif;
      font-size: 0.9rem;
      cursor: pointer;
      transition: background 0.18s, border-color 0.18s, color 0.18s;
      letter-spacing: 0.04em;
    }

    button:hover {
      background: rgba(200,169,110,0.18);
      border-color: #c8a96e;
      color: #f4e8c0;
    }

    button.active,
    button:active {
      background: rgba(200,169,110,0.32);
      border-color: #e8c870;
      color: #fff8e0;
    }

    button.sizeBtn.active {
      background: rgba(200,169,110,0.30);
      border-color: #e8c870;
      color: #fff8e0;
      font-weight: 600;
    }

    #btnPass {
      background: rgba(60,120,80,0.15);
      border-color: rgba(80,160,100,0.4);
    }

    #btnPass:hover {
      background: rgba(60,120,80,0.3);
      border-color: #60c080;
    }

    #btnPass.pass-urgent {
      background: rgba(232,200,80,0.22);
      border-color: #e8c850;
      color: #f4e060;
      font-weight: 600;
      animation: passGlow 1.2s ease-in-out infinite alternate;
    }

    @keyframes passGlow {
      from { box-shadow: 0 0 4px rgba(232,200,80,0.4); }
      to   { box-shadow: 0 0 14px rgba(232,200,80,0.9); }
    }

    #btnRestart {
      background: rgba(180,60,60,0.12);
      border-color: rgba(200,80,80,0.35);
    }

    #btnRestart:hover {
      background: rgba(180,60,60,0.28);
      border-color: #e06060;
    }

    .sep {
      width: 1px;
      height: 32px;
      background: rgba(200,169,110,0.25);
      align-self: center;
    }

    #msg {
      font-size: 0.85rem;
      color: #a08060;
      text-align: center;
      min-height: 20px;
    }
  </style>
</head>
<body>
  <div id="app">
    <h1>圍棋 <span>Go</span></h1>
    <canvas id="c"></canvas>
    <div id="info">載入中…</div>
    <div id="btns">
      <button class="sizeBtn" data-n="5">5×5</button>
      <button class="sizeBtn" data-n="7">7×7</button>
      <button class="sizeBtn" data-n="11">11×11</button>
      <button class="sizeBtn active" data-n="13">13×13</button>
      <div class="sep"></div>
      <button id="btnPass">虛手 (Pass)</button>
      <button id="btnRestart">重新開始</button>
    </div>
    <div id="msg">提示：死子應在虛手前提取，否則計為對方領地</div>
  </div>
  <script src="sketch.js?v=3"></script>
</body>
</html>
