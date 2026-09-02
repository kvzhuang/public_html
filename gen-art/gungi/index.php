<?php $title="軍儀棋 Gungi"; ?>
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title><?=$title?></title>
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
      padding: 20px;
    }
    h1 {
      font-size: 2rem;
      margin-bottom: 12px;
      letter-spacing: 0.1em;
    }
    h1 span {
      font-size: 1.2rem;
      color: #c8a96e;
      margin-left: 10px;
    }
    #app {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    canvas {
      border: 2px solid #8B6914;
      border-radius: 4px;
      cursor: pointer;
      display: block;
      max-width: 100%;
    }
    #msg {
      font-size: 1rem;
      color: #c8a96e;
      min-height: 1.5em;
      text-align: center;
    }
    #btns {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
    }
    button {
      background: #2d1810;
      color: #f0e8d0;
      border: 1px solid #8B6914;
      padding: 8px 20px;
      font-size: 1rem;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover { background: #4a2c1a; }
    button:disabled { opacity: 0.4; cursor: not-allowed; }
  </style>
</head>
<body>
  <div id="app">
    <h1>軍儀棋 <span>Gungi</span></h1>
    <canvas id="c" width="700" height="760"></canvas>
    <div id="msg"></div>
    <div id="btns">
      <button id="btnDone">結束部署</button>
      <button id="btnAuto">自動部署</button>
      <button id="btnNew">新（出手牌）</button>
      <button id="btnBattle">⚔ 自動對戰</button>
      <button id="btnRestart">重新開始</button>
    </div>
  </div>
  <script src="sketch.js?v=3"></script>
</body>
</html>
