<?php
$title = 'Omaha Poker 奧馬哈撲克';
?>
<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= htmlspecialchars($title, ENT_QUOTES, 'UTF-8') ?></title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.2/anime.min.js" defer></script>
  <style>
    :root {
      color-scheme: dark;
      --felt: #176247;
      --felt-dark: #0d352a;
      --rail: #3f2b20;
      --gold: #f2b84b;
      --ink: #eef8f3;
      --muted: #9fb9ae;
      --panel: rgba(8, 18, 18, .76);
      --danger: #ff6b6b;
      --ok: #67e8a1;
      --line: rgba(255,255,255,.14);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: Inter, "Noto Sans TC", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at 50% 36%, rgba(54, 173, 123, .28), transparent 30rem),
        linear-gradient(140deg, #071312, #102923 42%, #18110e);
      overflow-x: hidden;
    }

    button, select, input {
      font: inherit;
    }

    .app {
      min-height: 100vh;
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 12px;
      padding: 14px;
    }

    .topbar, .controls, .log-panel {
      background: var(--panel);
      border: 1px solid var(--line);
      backdrop-filter: blur(16px);
      box-shadow: 0 18px 44px rgba(0,0,0,.24);
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 58px;
      padding: 10px 12px;
      border-radius: 8px;
    }

    .topbar-toggle {
      display: none;
      min-width: 42px;
      min-height: 36px;
      border: 1px solid rgba(255,255,255,.18);
      border-radius: 8px;
      background: rgba(255,255,255,.08);
      color: var(--ink);
      cursor: pointer;
      font-weight: 900;
    }

    .brand {
      display: flex;
      align-items: baseline;
      gap: 12px;
      min-width: 0;
    }

    h1 {
      margin: 0;
      font-size: clamp(22px, 3vw, 34px);
      letter-spacing: 0;
      white-space: nowrap;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      color: var(--muted);
      font-size: 13px;
    }

    .online-human {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      min-width: 96px;
    }

    .online-human::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--ok);
      box-shadow: 0 0 10px rgba(103, 232, 161, .75);
    }

    .settings {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 8px;
    }

    .field {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 6px 8px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(255,255,255,.05);
      color: var(--muted);
      font-size: 13px;
      min-height: 38px;
    }

    select {
      color: var(--ink);
      background: #102923;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 5px 8px;
      outline: none;
    }

    .table-wrap {
      position: relative;
      min-height: 620px;
      display: grid;
      place-items: center;
    }

    .table {
      position: relative;
      width: min(1180px, 100%);
      height: min(68vh, 720px);
      min-height: 560px;
      border-radius: 46%;
      background:
        radial-gradient(ellipse at center, rgba(255,255,255,.12), transparent 58%),
        repeating-radial-gradient(ellipse at center, transparent 0 12px, rgba(255,255,255,.025) 13px 14px),
        linear-gradient(145deg, var(--felt), var(--felt-dark));
      border: clamp(14px, 2vw, 24px) solid var(--rail);
      box-shadow:
        inset 0 0 0 5px rgba(255,255,255,.08),
        inset 0 0 90px rgba(0,0,0,.35),
        0 28px 70px rgba(0,0,0,.42);
      overflow: visible;
    }

    .center {
      position: absolute;
      inset: 27% 24%;
      display: grid;
      place-items: center;
      align-content: center;
      gap: 14px;
      text-align: center;
      pointer-events: none;
    }

    .board {
      display: flex;
      justify-content: center;
      gap: clamp(6px, 1.2vw, 14px);
      min-height: 112px;
      width: 100%;
    }

    .pot {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 9px 14px;
      border-radius: 999px;
      background: rgba(4, 12, 11, .62);
      border: 1px solid rgba(255,255,255,.16);
      box-shadow: 0 12px 24px rgba(0,0,0,.18);
      font-weight: 800;
    }

    .chip-stack {
      width: 48px;
      height: 28px;
      position: relative;
    }

    .chip-stack::before,
    .chip-stack::after,
    .chip-dot {
      content: "";
      position: absolute;
      left: 0;
      width: 44px;
      height: 14px;
      border-radius: 50%;
      background: linear-gradient(90deg, #c23232 0 18%, #fff 18% 28%, #c23232 28% 72%, #fff 72% 82%, #c23232 82%);
      border: 2px solid rgba(255,255,255,.72);
      box-shadow: 0 3px 0 #7e1e25;
    }

    .chip-stack::before { top: 0; }
    .chip-stack::after { top: 9px; }
    .chip-dot { top: 18px; }

    .stage {
      min-height: 22px;
      color: rgba(255,255,255,.78);
      font-size: 14px;
    }

    .round-result {
      position: absolute;
      left: 50%;
      top: 18%;
      z-index: 5;
      transform: translateX(-50%);
      display: grid;
      gap: 3px;
      min-width: min(420px, 72%);
      padding: 13px 18px;
      border: 2px solid rgba(255, 228, 151, .92);
      border-radius: 8px;
      background: linear-gradient(180deg, rgba(43, 29, 10, .94), rgba(17, 41, 34, .94));
      box-shadow: 0 18px 36px rgba(0,0,0,.34), 0 0 34px rgba(242,184,75,.24);
      text-align: center;
      pointer-events: none;
    }

    .round-result-label {
      color: var(--gold);
      font-size: 12px;
      font-weight: 900;
    }

    .round-result-text {
      color: #fff9df;
      font-size: clamp(18px, 2.2vw, 28px);
      font-weight: 900;
    }

    .seat {
      position: absolute;
      width: clamp(146px, 16vw, 192px);
      min-height: 126px;
      transform: translate(-50%, -50%);
      padding: 10px;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 8px;
      background: rgba(5, 16, 16, .78);
      box-shadow: 0 18px 36px rgba(0,0,0,.25);
      transition: border-color .18s ease, transform .18s ease, opacity .18s ease;
    }

    .seat.active {
      border-color: rgba(242,184,75,.9);
      box-shadow: 0 0 0 2px rgba(242,184,75,.16), 0 18px 36px rgba(0,0,0,.25);
    }

    .seat.winner {
      border-color: rgba(255, 228, 151, .96);
      box-shadow: 0 0 0 3px rgba(242,184,75,.24), 0 0 34px rgba(242,184,75,.26), 0 18px 36px rgba(0,0,0,.25);
    }

    .winner-tag {
      position: absolute;
      left: 50%;
      top: -14px;
      transform: translateX(-50%);
      z-index: 2;
      padding: 4px 10px;
      border-radius: 999px;
      background: linear-gradient(180deg, #ffe497, #d99524);
      color: #17100a;
      font-size: 12px;
      font-weight: 900;
      white-space: nowrap;
      box-shadow: 0 8px 18px rgba(0,0,0,.3);
    }

    .seat.folded {
      opacity: .5;
    }

    .seat.out {
      opacity: .35;
      filter: grayscale(.8);
    }

    .seat.you {
      background: rgba(14, 34, 31, .92);
      border-color: rgba(103,232,161,.38);
    }

    .seat-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }

    .player-id {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .avatar-button {
      width: 42px;
      height: 42px;
      flex: 0 0 auto;
      display: grid;
      place-items: center;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: transparent;
      cursor: pointer;
    }

    .avatar-button:focus-visible {
      outline: 3px solid rgba(103,232,161,.86);
      outline-offset: 3px;
    }

    .avatar {
      width: 38px;
      height: 38px;
      flex: 0 0 auto;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid rgba(255,255,255,.72);
      background: rgba(255,255,255,.08);
      box-shadow: 0 8px 18px rgba(0,0,0,.28);
    }

    .name {
      min-width: 0;
      font-weight: 800;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .badge {
      flex: 0 0 auto;
      min-width: 26px;
      height: 24px;
      display: inline-grid;
      place-items: center;
      padding: 0 7px;
      border-radius: 999px;
      background: rgba(255,255,255,.08);
      color: var(--gold);
      font-size: 12px;
      font-weight: 900;
    }

    .dealer-host {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      padding: 7px 10px;
      border: 1px solid rgba(255,255,255,.16);
      border-radius: 999px;
      background: rgba(4, 12, 11, .68);
      box-shadow: 0 12px 24px rgba(0,0,0,.2);
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
    }

    .dealer-host .avatar {
      width: 34px;
      height: 34px;
      border-color: rgba(242,184,75,.85);
    }

    .player-modal {
      position: fixed;
      inset: 0;
      z-index: 20;
      display: grid;
      place-items: center;
      padding: 20px;
      background: rgba(3, 8, 8, .72);
      backdrop-filter: blur(8px);
    }

    .player-modal[hidden] {
      display: none;
    }

    .player-card {
      width: min(440px, 100%);
      max-height: min(680px, calc(100vh - 40px));
      overflow: auto;
      border: 1px solid rgba(255,255,255,.16);
      border-radius: 8px;
      background: #0b1716;
      box-shadow: 0 24px 70px rgba(0,0,0,.5);
      color: var(--ink);
    }

    .player-card-head {
      display: flex;
      justify-content: flex-end;
      padding: 10px;
    }

    .icon-btn {
      width: 36px;
      height: 36px;
      border: 1px solid rgba(255,255,255,.16);
      border-radius: 50%;
      background: rgba(255,255,255,.07);
      color: var(--ink);
      cursor: pointer;
      font-size: 22px;
      line-height: 1;
    }

    .player-card-body {
      display: grid;
      gap: 14px;
      padding: 0 22px 22px;
    }

    .player-portrait {
      width: 132px;
      height: 132px;
      justify-self: center;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid rgba(242,184,75,.82);
      background: rgba(255,255,255,.08);
      box-shadow: 0 18px 36px rgba(0,0,0,.34);
    }

    .player-card-title {
      margin: 0;
      text-align: center;
      font-size: 26px;
      letter-spacing: 0;
    }

    .player-card-meta {
      display: flex;
      justify-content: center;
      gap: 8px;
      flex-wrap: wrap;
      color: var(--muted);
      font-size: 13px;
      font-weight: 800;
    }

    .player-card-section {
      display: grid;
      gap: 7px;
      padding-top: 12px;
      border-top: 1px solid rgba(255,255,255,.1);
    }

    .player-card-section h3 {
      margin: 0;
      color: var(--gold);
      font-size: 14px;
      letter-spacing: 0;
    }

    .player-card-section p {
      margin: 0;
      color: rgba(255,255,255,.82);
      line-height: 1.55;
    }

    .quote-list {
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .quote-list li {
      padding: 8px 10px;
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 8px;
      background: rgba(255,255,255,.05);
      color: #fff9df;
      line-height: 1.45;
      font-size: 14px;
    }

    .cards {
      min-height: 58px;
      display: flex;
      gap: 7px;
      justify-content: center;
      align-items: center;
    }

    /* 奧馬哈：每人 4 張底牌，座位內的牌需縮小以免撐破 */
    .seat .cards {
      gap: 4px;
    }

    .seat .cards .card {
      width: clamp(28px, 3.1vw, 40px);
    }

    .card {
      width: clamp(40px, 4.7vw, 58px);
      aspect-ratio: 5 / 7;
      border-radius: 7px;
      background: #f8f4e8;
      color: #151515;
      display: grid;
      grid-template-rows: auto 1fr auto;
      padding: 5px;
      box-shadow: 0 8px 18px rgba(0,0,0,.28);
      border: 1px solid rgba(0,0,0,.18);
      font-weight: 900;
      line-height: 1;
      user-select: none;
      transform-origin: center;
    }

    .card.red { color: #c81e3a; }
    .card.back {
      background:
        linear-gradient(135deg, rgba(255,255,255,.18), transparent 24%),
        repeating-linear-gradient(45deg, #1d4f8f 0 7px, #173f73 7px 14px);
      border: 2px solid #e8efff;
      color: transparent;
    }

    .rank { font-size: clamp(15px, 1.7vw, 20px); }
    .suit {
      display: grid;
      place-items: center;
      font-size: clamp(22px, 3vw, 34px);
    }
    .rank.bottom {
      transform: rotate(180deg);
      justify-self: end;
    }

    .stack-row, .bet-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.4;
    }

    .stack-row strong, .bet-row strong {
      color: var(--ink);
    }

    .status {
      min-height: 21px;
      margin-top: 4px;
      color: var(--gold);
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .personality {
      color: rgba(255,255,255,.58);
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .table-talk {
      position: absolute;
      left: 50%;
      bottom: calc(100% + 8px);
      z-index: 4;
      max-width: min(240px, 62vw);
      transform: translateX(-50%);
      padding: 7px 10px;
      border: 1px solid rgba(255,255,255,.18);
      border-radius: 8px;
      background: rgba(8, 18, 18, .92);
      color: #fff9df;
      box-shadow: 0 12px 26px rgba(0,0,0,.32);
      font-size: 13px;
      line-height: 1.35;
      text-align: left;
      pointer-events: none;
    }

    .table-talk::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 100%;
      width: 10px;
      height: 10px;
      transform: translate(-50%, -5px) rotate(45deg);
      border-right: 1px solid rgba(255,255,255,.18);
      border-bottom: 1px solid rgba(255,255,255,.18);
      background: rgba(8, 18, 18, .92);
    }

    .dealer {
      background: #f9f1d0;
      color: #151515;
    }

    .controls {
      display: grid;
      grid-template-columns: minmax(220px, 1fr) minmax(300px, 520px);
      gap: 12px;
      align-items: center;
      padding: 12px;
      border-radius: 8px;
    }

    .hand-readout {
      min-width: 0;
    }

    .hand-title {
      margin: 0 0 4px;
      color: var(--ok);
      font-weight: 900;
    }

    .hint {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
      grid-column: 2;
    }

    .raise-builder {
      display: grid;
      gap: 8px;
      justify-self: end;
      width: min(520px, 100%);
      padding: 10px;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 8px;
      background: rgba(255,255,255,.05);
    }

    .raise-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      color: var(--muted);
      font-size: 12px;
    }

    .raise-summary-main {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
      min-width: 0;
      flex: 1 1 auto;
    }

    .raise-summary strong {
      color: var(--gold);
      font-size: 15px;
    }

    .raise-toggle {
      flex: 0 0 auto;
      width: 32px;
      height: 30px;
      border: 1px solid rgba(255,255,255,.16);
      border-radius: 8px;
      background: rgba(255,255,255,.07);
      color: var(--ink);
      cursor: pointer;
      font-weight: 900;
      line-height: 1;
    }

    .raise-builder.is-collapsed .quick-raises,
    .raise-builder.is-collapsed .custom-raise,
    .raise-builder.is-collapsed .raise-help {
      display: none;
    }

    .quick-raises {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 6px;
    }

    .quick-raise {
      min-height: 34px;
      padding: 6px 8px;
      border: 1px solid rgba(255,255,255,.16);
      border-radius: 8px;
      background: rgba(255,255,255,.07);
      color: var(--ink);
      cursor: pointer;
      font-weight: 800;
    }

    .quick-raise:disabled {
      opacity: .42;
      cursor: not-allowed;
    }

    .custom-raise {
      display: grid;
      grid-template-columns: 1fr 118px;
      gap: 8px;
      align-items: center;
    }

    .custom-raise input[type="range"] {
      width: 100%;
      accent-color: var(--gold);
    }

    .custom-raise input[type="number"] {
      width: 100%;
      min-height: 36px;
      padding: 6px 8px;
      border: 1px solid rgba(255,255,255,.18);
      border-radius: 8px;
      background: #102923;
      color: var(--ink);
      outline: none;
    }

    .raise-help {
      min-height: 18px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.35;
    }

    .btn {
      min-height: 42px;
      border: 1px solid rgba(255,255,255,.18);
      border-radius: 8px;
      padding: 9px 13px;
      background: rgba(255,255,255,.08);
      color: var(--ink);
      cursor: pointer;
      font-weight: 800;
      transition: transform .14s ease, background .14s ease, border-color .14s ease;
    }

    .btn:hover:not(:disabled) {
      transform: translateY(-1px);
      background: rgba(255,255,255,.13);
    }

    .btn:disabled {
      opacity: .42;
      cursor: not-allowed;
    }

    .btn.primary {
      background: linear-gradient(180deg, #f7c96b, #d99524);
      color: #17100a;
      border-color: rgba(255,242,191,.55);
    }

    .btn.danger {
      color: #ffe7e7;
      border-color: rgba(255,107,107,.45);
      background: rgba(130, 25, 38, .42);
    }

    .log-panel {
      height: 128px;
      overflow: auto;
      border-radius: 8px;
      padding: 10px 12px;
      color: #d8ebe3;
      font-size: 13px;
      line-height: 1.5;
    }

    .log-entry {
      border-bottom: 1px solid rgba(255,255,255,.08);
      padding: 3px 0;
    }

    .winner-flash {
      animation: flash 1s ease-in-out infinite alternate;
    }

    @keyframes flash {
      from { border-color: rgba(103,232,161,.45); }
      to { border-color: rgba(242,184,75,1); }
    }

    @media (min-width: 821px) {
      .app {
        height: 100vh;
        grid-template-columns: minmax(0, 1fr) minmax(320px, 380px);
        grid-template-rows: auto minmax(0, 1fr) 128px;
      }

      .topbar {
        grid-column: 1 / -1;
      }

      .table-wrap {
        grid-column: 1;
        grid-row: 2 / 4;
        min-height: 0;
      }

      .table {
        height: 100%;
        min-height: 0;
      }

      .controls {
        grid-column: 2;
        grid-row: 2;
        grid-template-columns: 1fr;
        align-content: start;
        align-items: stretch;
        align-self: stretch;
        overflow: auto;
      }

      .raise-builder {
        justify-self: stretch;
        width: 100%;
      }

      .actions {
        display: grid;
        grid-column: auto;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        justify-content: stretch;
      }

      .actions .btn {
        width: 100%;
        padding-inline: 9px;
      }

      .log-panel {
        grid-column: 2;
        grid-row: 3;
      }
    }

    @media (max-width: 820px) {
      .app {
        min-height: 100svh;
        grid-template-rows: auto minmax(0, 1fr) auto;
        gap: 6px;
        padding: 6px;
      }
      .topbar {
        position: sticky;
        top: 6px;
        z-index: 10;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 6px;
        min-height: 44px;
        padding: 6px 7px;
      }
      .topbar-toggle {
        display: inline-grid;
        place-items: center;
        grid-column: 2;
        grid-row: 1;
      }
      .brand {
        grid-column: 1;
        grid-row: 1;
        flex-direction: column;
        gap: 2px;
      }
      .settings {
        grid-column: 1 / -1;
        justify-content: stretch;
      }
      .meta {
        gap: 6px;
        font-size: 12px;
      }
      .settings .field,
      .settings .btn {
        flex: 1 1 auto;
      }
      .topbar.is-collapsed .settings {
        display: none;
      }
      .topbar.is-collapsed h1 {
        font-size: 18px;
      }
      .topbar.is-collapsed .brand {
        flex-direction: row;
        align-items: center;
        gap: 8px;
      }
      .topbar.is-collapsed .meta {
        min-width: 0;
        overflow: hidden;
        white-space: nowrap;
      }
      .topbar.is-collapsed .meta span {
        display: none;
      }
      .topbar.is-collapsed .meta span:nth-child(2) {
        display: inline;
      }
      .controls {
        position: sticky;
        bottom: 6px;
        z-index: 9;
        grid-template-columns: 1fr;
        align-items: stretch;
        gap: 6px;
        padding: 7px;
      }
      .hand-title {
        margin: 0;
        font-size: 13px;
      }
      .hint {
        display: none;
      }
      .raise-builder {
        justify-self: stretch;
        width: 100%;
        gap: 6px;
        padding: 7px;
      }
      .raise-builder.is-collapsed {
        padding-block: 6px;
      }
      .raise-summary {
        gap: 6px;
      }
      .raise-summary-main {
        gap: 6px;
      }
      .raise-summary-main span {
        display: none;
      }
      .quick-raises {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
      .custom-raise { grid-template-columns: 1fr; }
      .actions {
        display: grid;
        grid-column: auto;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
        justify-content: stretch;
      }
      .btn {
        min-height: 36px;
        padding: 7px 6px;
        font-size: 13px;
      }
      .log-panel {
        display: none;
      }
      .table-wrap {
        min-height: min(560px, calc(100svh - 178px));
      }
      .table {
        width: 100%;
        height: min(560px, calc(100svh - 178px));
        min-height: 430px;
        border-width: 10px;
        border-radius: 30px;
      }
      .center {
        inset: 34% 8%;
        gap: 8px;
      }
      .dealer-host {
        gap: 6px;
        padding: 5px 8px;
      }
      .dealer-host .avatar {
        width: 26px;
        height: 26px;
      }
      .board {
        min-height: 74px;
        gap: 4px;
      }
      .pot {
        gap: 7px;
        padding: 6px 10px;
        font-size: 13px;
      }
      .chip-stack {
        width: 34px;
        height: 20px;
      }
      .chip-stack::before,
      .chip-stack::after,
      .chip-dot {
        width: 31px;
        height: 10px;
      }
      .chip-stack::after { top: 6px; }
      .chip-dot { top: 12px; }
      .stage {
        min-height: 18px;
        font-size: 12px;
      }
      .round-result {
        top: 25%;
        min-width: min(330px, 82%);
        padding: 10px 12px;
      }
      .seat {
        width: min(31vw, 118px);
        min-height: 0;
        padding: 5px;
      }
      .seat-head {
        gap: 5px;
        margin-bottom: 4px;
      }
      .player-id {
        gap: 5px;
      }
      .avatar {
        width: 28px;
        height: 28px;
      }
      .avatar-button {
        width: 31px;
        height: 31px;
      }
      .name {
        font-size: 12px;
      }
      .badge {
        min-width: 21px;
        height: 20px;
        padding: 0 5px;
        font-size: 10px;
      }
      .cards {
        min-height: 39px;
        gap: 3px;
      }
      .seat .cards {
        gap: 2px;
      }
      .seat .cards .card {
        width: clamp(20px, 5.6vw, 26px);
      }
      .card {
        width: clamp(27px, 7.5vw, 32px);
        border-radius: 5px;
        padding: 3px;
      }
      .rank { font-size: 11px; }
      .suit { font-size: 16px; }
      .stack-row,
      .bet-row,
      .status {
        font-size: 11px;
        line-height: 1.25;
      }
      .stack-row span,
      .bet-row span {
        display: none;
      }
      .stack-row,
      .bet-row {
        justify-content: center;
      }
      .bet-row {
        display: none;
      }
      .status {
        min-height: 14px;
        margin-top: 2px;
        text-align: center;
      }
      .personality,
      .table-talk {
        display: none;
      }
      .player-portrait {
        width: 116px;
        height: 116px;
      }
    }
  </style>
</head>
<body>
  <main class="app">
    <header class="topbar is-collapsed" id="topbar">
      <div class="brand">
        <h1>Omaha Poker 奧馬哈</h1>
        <div class="meta">
          <span>起始籌碼 <strong id="startingStackText">2000</strong></span>
          <span>盲注 <strong id="blindText">25 / 50</strong></span>
          <span>真人玩家：你</span>
          <span class="online-human">線上真人 <strong id="onlineHumanText">同步中</strong></span>
        </div>
      </div>
      <button class="topbar-toggle" id="topbarToggle" type="button" aria-controls="topbar" aria-expanded="false">設定</button>
      <div class="settings">
        <label class="field">人數
          <select id="playerCount">
            <option value="4">4</option>
            <option value="5">5</option>
            <option value="6" selected>6</option>
            <option value="7">7</option>
            <option value="8">8</option>
          </select>
        </label>
        <label class="field">小盲
          <select id="smallBlind">
            <option value="10">10</option>
            <option value="25" selected>25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>
        <button class="btn primary" id="newGameBtn" type="button">新牌桌</button>
        <button class="btn" id="exportLogBtn" type="button">匯出紀錄</button>
      </div>
    </header>

    <section class="table-wrap" aria-label="奧馬哈撲克牌桌">
      <div class="table" id="table">
        <div class="center">
          <div class="dealer-host">
            <img class="avatar" id="dealerPortrait" alt="發牌者頭像" src="">
            <span>發牌者</span>
          </div>
          <div class="board" id="board"></div>
          <div class="pot">
            <span class="chip-stack"><span class="chip-dot"></span></span>
            <span>底池 <strong id="potText">0</strong></span>
          </div>
          <div class="stage" id="stageText">準備開局</div>
        </div>
      </div>
    </section>

    <section class="controls">
      <div class="hand-readout">
        <p class="hand-title" id="handTitle">按「新牌桌」開始</p>
        <div class="hint" id="hintText">奧馬哈：每人 4 張底牌，成手時必須「恰好用 2 張底牌 ＋ 3 張公共牌」。你坐下方座位，其餘由電腦操作。</div>
      </div>
      <div class="raise-builder" id="raiseBuilder" aria-label="加注金額">
        <div class="raise-summary">
          <div class="raise-summary-main">
            <span>自訂大加注</span>
            <strong id="raiseTargetText">加注到 0</strong>
          </div>
          <button class="raise-toggle" id="raiseToggle" type="button" aria-controls="raiseBuilder" aria-expanded="true" title="收合自訂大加注">−</button>
        </div>
        <div class="quick-raises">
          <button class="quick-raise" data-raise-preset="2x" type="button">2x</button>
          <button class="quick-raise" data-raise-preset="3x" type="button">3x</button>
          <button class="quick-raise" data-raise-preset="half-pot" type="button">1/2 Pot</button>
          <button class="quick-raise" data-raise-preset="all-in" type="button">All-in</button>
        </div>
        <label class="custom-raise">
          <input id="raiseSlider" type="range" min="0" max="0" step="1" value="0">
          <input id="raiseInput" type="number" min="0" max="0" step="1" value="0" inputmode="numeric" aria-label="自訂加注到金額">
        </label>
        <div class="raise-help" id="raiseHelp">輪到你時可自訂加注到的總金額。</div>
      </div>
      <div class="actions">
        <button class="btn danger" id="foldBtn" type="button">棄牌</button>
        <button class="btn" id="callBtn" type="button">跟注</button>
        <button class="btn" id="raiseBtn" type="button">加注</button>
        <button class="btn" id="potRaiseBtn" type="button">大加注</button>
        <button class="btn primary" id="allInBtn" type="button">All-in</button>
        <button class="btn primary" id="nextHandBtn" type="button">下一局</button>
      </div>
    </section>

    <aside class="log-panel" id="log" aria-label="遊戲紀錄"></aside>
  </main>

  <div class="player-modal" id="playerModal" hidden>
    <article class="player-card" role="dialog" aria-modal="true" aria-labelledby="playerInfoName">
      <div class="player-card-head">
        <button class="icon-btn" id="playerModalClose" type="button" aria-label="關閉">×</button>
      </div>
      <div class="player-card-body">
        <img class="player-portrait" id="playerInfoPortrait" alt="" src="">
        <h2 class="player-card-title" id="playerInfoName"></h2>
        <div class="player-card-meta" id="playerInfoMeta"></div>
        <section class="player-card-section">
          <h3>個性</h3>
          <p id="playerInfoPersonality"></p>
        </section>
        <section class="player-card-section">
          <h3>曾經說過的話</h3>
          <ul class="quote-list" id="playerInfoQuotes"></ul>
        </section>
      </div>
    </article>
  </div>

  <script>
    const SUITS = ["♠", "♥", "♦", "♣"];
    const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    const RANK_TEXT = {11: "J", 12: "Q", 13: "K", 14: "A"};
    const HAND_NAMES = ["高牌", "一對", "兩對", "三條", "順子", "同花", "葫蘆", "四條", "同花順"];
    const STORAGE_KEY = "omaha-poker-game-state-v1";
    const PORTRAITS = Array.from({ length: 10 }, (_, i) => `portrait/portrait_${String(i + 1).padStart(2, "0")}.jpg`);
    const PRESENCE_URL = "/api/presence.php";
    const PRESENCE_APP = "omaha-poker";
    const AI_DELAY = {
      normal: [220, 460],
      folded: [60, 130]
    };
    const STREET_DELAY = {
      normal: 360,
      folded: 90
    };
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const AI_PERSONALITIES = [
      {
        key: "fire",
        label: "火炮",
        summary: "鬆兇，愛施壓",
        config: { callBias: -.08, raiseBias: -.16, checkRaise: -.18, bluff: .2, randomCall: .18, allInGamble: .15, raiseScale: 1.58, trapCall: 0, panicFold: -.04 },
        lines: [
          "這池太安靜了，我來加點聲音。", "你們都在等牌？我等你們犯錯。", "小注看不出性格，拉高一點。", "我喜歡讓人用籌碼回答問題。", "桌上沒火，我就自己點。",
          "壓力才會把牌面講清楚。", "跟不跟？不要想太久。", "我這手牌不一定大，但氣勢很大。", "底池太瘦了，補點重量。", "你看起來很想省錢。",
          "我先開槍，誰要接？", "牌桌上最貴的是猶豫。", "再慢我就當你怕了。", "有人要守，我就要攻。", "我不太愛免費牌。",
          "這個位置很適合偷一下。", "別把我的加注想得太複雜。", "我今天的油門有點鬆。", "你若只會等堅果牌，籌碼會先乾。", "我看到一個可以搶的底池。",
          "牌面濕，我更想收費。", "讓我看看誰真的有東西。", "跟注可以，代價先付。", "我不怕翻車，怕沒踩油門。", "這局節奏我拿走了。",
          "你們的沉默聽起來像弱。", "用籌碼說話比較快。", "我加注不是通知，是考試。", "底池放著會冷掉。", "我不太相信過牌的人。",
          "你要看下一張？先付門票。", "別只看牌，也看看我。", "我在這裡不賣便宜牌。", "這手能打，為什麼不打大？", "有人想撿便宜，我先鎖門。",
          "我喜歡讓河牌之前就做決定。", "你們越緊，我越舒服。", "籌碼還多，故事就要講大聲。", "這下注有點像警告。", "我不保證有牌，但保證有壓力。",
          "牌桌不是存錢筒。", "我看見空檔就會進去。", "弱跟注很香。", "這種底池不搶可惜。", "我要把簡單問題變貴。",
          "誰說翻牌前不能有戲？", "我先把風向改一下。", "你如果在等我慢下來，可能要等很久。", "小牌也能打出大麻煩。", "好，現在大家醒了。"
        ]
      },
      {
        key: "stone",
        label: "鐵壁",
        summary: "緊弱，重視成牌",
        config: { callBias: .16, raiseBias: .1, checkRaise: .12, bluff: .025, randomCall: .04, allInGamble: .02, raiseScale: .96, trapCall: .05, panicFold: .08 },
        lines: [
          "不急，籌碼留著才有下一手。", "這牌面不需要逞強。", "好牌自然會來。", "我不跟運氣吵架。", "能少輸也是贏的一部分。",
          "我先把範圍收乾淨。", "沒必要用邊緣牌冒險。", "你們打大，我就看清楚一點。", "便宜才看，貴就算了。", "我不追太薄的希望。",
          "這個價錢不太健康。", "慢慢來，牌桌會自己露答案。", "我只買合理的機會。", "籌碼不是拿來證明勇氣的。", "這手牌還沒到出門的時候。",
          "我寧可錯過，也不亂撞。", "你的下注有話，我先聽完。", "牌面太黏，別硬來。", "小心一點，活久一點。", "我不是不敢，是沒必要。",
          "這裡守住比較重要。", "底池夠大了，別亂加柴。", "我會等更乾淨的點。", "你們繼續，我先省一筆。", "這種牌不值得英雄跟注。",
          "我只在有把握時推進。", "邊緣牌最會偷籌碼。", "我相信紀律，不相信衝動。", "這局讓別人表演。", "不舒服的價格就不付。",
          "我把弱牌放掉，讓強牌賺錢。", "看起來熱鬧，不代表值得進場。", "這手我不想把故事寫太長。", "牌不夠硬，話就少一點。", "先保留子彈。",
          "你要嚇我，也得先有牌。", "別人怕錯過，我怕亂跟。", "桌上風大，我把門關好。", "好位置也不能救爛牌。", "我不急著證明什麼。",
          "每一枚籌碼都要有理由。", "我先讓這局簡單一點。", "強牌不用每天都有。", "我會等錯誤自己走過來。", "這注不像便宜情報。",
          "牌面說慢，我就慢。", "活著才有機會收大池。", "我不討厭棄牌。", "下一手也許更好。", "紀律比煙火耐用。"
        ]
      },
      {
        key: "shadow",
        label: "影子",
        summary: "慢打，誘捕反擊",
        config: { callBias: -.02, raiseBias: .05, checkRaise: .22, bluff: .08, randomCall: .1, allInGamble: .05, raiseScale: 1.3, trapCall: .28, panicFold: 0 },
        lines: [
          "你先講，我聽。", "這牌面可以慢慢走。", "別急著把答案翻開。", "有時候安靜比較貴。", "我喜歡讓別人自己加註。",
          "過牌不代表沒故事。", "你下注，我就多知道一點。", "這池可以養一下。", "我不急著把你嚇跑。", "讓牌桌自己動起來。",
          "我跟，先不打草驚蛇。", "你覺得我弱就好。", "這條線還可以藏。", "小聲一點，籌碼才會靠近。", "我在等一個願意出價的人。",
          "免費牌？也許是陷阱。", "我喜歡後面再說重話。", "你若想偷，請繼續。", "我先把門開著。", "這手不用急著亮刀。",
          "看起來普通，才有趣。", "你的下注像在問路。", "我暫時不回答。", "慢慢來，河牌會讓人誠實。", "有人自己會把底池做大。",
          "我跟得很輕，其實不一定輕。", "別把我的沉默當放棄。", "這個故事還不到高潮。", "我在看誰先失去耐心。", "好牌也可以低調。",
          "有些牌要等對手幫忙。", "你打，我記。", "這一步不需要太用力。", "如果你想代表強牌，我想看看。", "我的範圍先留一點霧。",
          "桌上越吵，我越安靜。", "我不反擊，不代表沒有反擊。", "這個價格可以陪你演。", "你可能正在幫我下注。", "別急，籌碼會自己說漏嘴。",
          "我先讓你舒服一點。", "我喜歡在轉牌後才改語氣。", "你現在很有信心，真好。", "這不是退讓，是等待。", "我把大動作留給後面。",
          "有些圈套看起來像讓步。", "這手牌還有第二層。", "讓你先走比較有資訊。", "牌桌上的陰影也會咬人。", "現在先不驚動你。"
        ]
      },
      {
        key: "river",
        label: "河馬",
        summary: "跟注站，愛看牌",
        config: { callBias: -.2, raiseBias: .22, checkRaise: .18, bluff: .04, randomCall: .24, allInGamble: .07, raiseScale: .9, trapCall: .08, panicFold: -.08 },
        lines: [
          "我想看下一張。", "這個價錢還可以啦。", "跟一下，不會少一塊肉。", "牌還沒完，別急著判死刑。", "我來陪你到轉牌。",
          "河牌見真章。", "你下注，我好奇。", "我這手有一點味道。", "再看一張就知道。", "我不喜歡太早放棄。",
          "也許奇蹟就在牌堆上面。", "小注我很難不看。", "跟注是我的母語。", "牌面還有救。", "我先買一張票。",
          "你可能有牌，我也可能中。", "這局我想走遠一點。", "不要低估後門。", "再陪一圈。", "我知道不標準，但我想看。",
          "牌桌要有耐心。", "我這張聽牌有點黏。", "底池已經在叫我了。", "折掉太可惜。", "跟到河牌才有故事。",
          "我有一點點理由。", "這價格像在邀請我。", "你打得不夠貴，我就進來。", "我不確定，但我想知道。", "也許下一張會說服大家。",
          "我先不走。", "這手牌還會長大。", "看牌是樂趣的一半。", "你若要趕我，下注再大點。", "我有位置就更想跟。",
          "這不是固執，是研究。", "我買的是可能性。", "牌堆欠我一張好牌。", "跟注一下，心情比較完整。", "我不想錯過反轉。",
          "小小希望也能收大池。", "再看一張，真的最後一張。", "這種牌放掉會睡不著。", "我知道你在笑，沒關係。", "底池賠率聽起來很友善。",
          "我會把牌看完再說。", "追牌要有信仰。", "你下注，我付學費。", "也許我正在釣你，也許只是想看。", "河牌不要讓我失望。"
        ]
      },
      {
        key: "blade",
        label: "短刀",
        summary: "短籌碼壓迫，全下多",
        config: { callBias: -.04, raiseBias: -.08, checkRaise: -.08, bluff: .12, randomCall: .08, allInGamble: .22, raiseScale: 1.85, trapCall: .02, panicFold: .02 },
        lines: [
          "籌碼短，就不繞路。", "我喜歡把問題一次問完。", "這手要嘛進去，要嘛算了。", "小空間更適合大動作。", "我沒有太多街可以等。",
          "壓力要趁早給。", "短籌碼也有刀口。", "你要跟，就跟完整的。", "我不想被盲注慢慢吃掉。", "這裡可以推。",
          "籌碼少，決定要快。", "我不打半套。", "翻牌前就能解決很多事。", "有人怕全下，我不怕。", "我用剩下的籌碼說話。",
          "這個點適合孤注。", "我寧可主動死，也不被磨死。", "短籌碼要偷得準。", "你跟得下來嗎？", "我把 fold equity 先拿出來。",
          "這不是莽，是時間不多。", "盲注快到了，我先動。", "籌碼深的人才有資格慢。", "我用一刀處理。", "別給我便宜看牌。",
          "我需要翻倍，不需要漂亮。", "這手牌夠推了。", "你若邊緣，就會很痛。", "短桌短命，要先搶。", "我不想被迫跟注，我要先下注。",
          "這裡沒有太多轉圜。", "全下比猜三街乾淨。", "讓你一次付清。", "我把壓力推回去。", "短籌碼也能讓人難受。",
          "別看我少，就當我不存在。", "這刀不長，但很快。", "我先把選項縮小。", "翻倍才有後面的故事。", "我不等完美牌。",
          "有摺牌率就有希望。", "你要抓，就拿真牌來。", "我這手不想拖到河牌。", "籌碼越短，聲音越大。", "這是我的時間點。",
          "小注對我沒意義。", "推進去，讓牌自己跑。", "我把命運壓在中間。", "你若怕波動，現在很難受。", "短刀出鞘。"
        ]
      },
      {
        key: "mad-dog",
        label: "瘋狗",
        summary: "極鬆極兇，亂咬底池",
        config: { callBias: -.24, raiseBias: -.28, checkRaise: -.26, bluff: .34, randomCall: .28, allInGamble: .28, raiseScale: 2.15, trapCall: 0, panicFold: -.14 },
        lines: [
          "我聞到弱味了，先咬一口。", "這局誰想安靜？我不同意。", "牌不牌的先放旁邊，籌碼先進來。", "你們慢慢算，我先把底池撕開。", "我今天不散步，我是衝刺。",
          "跟我打牌要戴安全帽。", "這個底池太乖了，我來教壞它。", "你看起來像會棄牌的人。", "我不問理由，我問你敢不敢。", "小注像零食，不夠我吃。",
          "別盯著我看，盯著你的籌碼。", "我可能有牌，也可能只是心情好。", "好位置？壞牌？都可以開咬。", "你要抓我，就拿籌碼來抓。", "翻牌前先吵一架。",
          "桌上有人怕波動，我最喜歡。", "這下注沒有禮貌，剛好適合我。", "我不慢打，我亂打。", "底池越亂，我越清醒。", "你如果只等好牌，會被我啃到沒耐心。",
          "我先把你的計畫咬破。", "這不是詐唬，這是打招呼。", "看下一張？可以，票價我訂。", "我跟牌不是因為合理，是因為好玩。", "籌碼放著會發霉。",
          "你們的範圍太整齊了。", "我把牌桌變成夜市。", "誰說爛牌不能收租？", "你要想很久，我就再加一點。", "我喜歡讓人討厭自己的好牌。",
          "這裡適合不講道理。", "我看見底池就想撲上去。", "你代表強牌？我代表麻煩。", "別用理論管我，理論追不上。", "我不怕被抓，怕沒人跟。",
          "這個價錢很瘋，我喜歡。", "你若在設陷阱，我先把陷阱踢翻。", "中一點也能打很大。", "我把每一街都當河牌打。", "下注聲音再大一點才像牌局。",
          "你想便宜實現勝率？先問我。", "我今天沒有剎車皮。", "好牌賺錢，瘋牌也賺氣勢。", "你不舒服就對了。", "底池是骨頭，我先叼走。",
          "這手牌不漂亮，但很吵。", "我要讓你用最大代價看最小資訊。", "我可能下一秒就全下。", "牌桌上最怕的是可預測，我剛好不是。", "瘋狗進池，門關起來。"
        ]
      },
      {
        key: "gto",
        label: "GTO",
        summary: "平衡範圍，頻率精準",
        config: { callBias: .02, raiseBias: .02, checkRaise: .04, bluff: .11, randomCall: .06, allInGamble: .04, raiseScale: 1.18, trapCall: .12, panicFold: .04 },
        lines: [
          "這裡用混合策略比較乾淨。", "我的範圍需要保護。", "這個尺寸能讓你最難受。", "我不只代表一種牌。", "頻率到了，該下注。",
          "底池賠率允許我繼續。", "這條線保留足夠強牌。", "我會讓價值牌和詐唬長得一樣。", "你的尺寸給了我資訊。", "這裡不能過度棄牌。",
          "小盲防守要有紀律。", "我用範圍，不用情緒。", "這個牌面偏向我的位置。", "我需要一些低頻率加注。", "讓你無法只對一端反應。",
          "這手牌適合放進跟注頻率。", "阻擋牌還不錯。", "我不需要每次都有牌。", "這個下注尺寸壓到你的邊緣範圍。", "轉牌改變了範圍優勢。",
          "我會保留一些慢打組合。", "這裡詐唬要挑對候選牌。", "你如果過度跟注，價值牌會收錢。", "你如果過度棄牌，詐唬會收錢。", "平衡不是好看，是讓你難受。",
          "我的底池控制有足夠理由。", "這張河牌降低你的堅果密度。", "我需要把棄牌率算進去。", "這不是害怕，是範圍管理。", "我把強牌和聽牌一起推進。",
          "這裡下注三分之一就夠了。", "你的範圍有太多中等牌。", "我用位置兌現一些邊緣勝率。", "免費牌會讓我的範圍太透明。", "這手拿來 check-back 比較好。",
          "我會讓你猜不到上限。", "這不是讀人，是讀結構。", "如果你加注過多，我會擴大跟注。", "如果你太緊，我會增加偷池。", "這裡需要保留再加注範圍。",
          "牌面越乾，尺寸越可以小。", "牌面越濕，收費要更明確。", "我的組合數還站得住。", "這個 blocker 讓詐唬合理。", "我不追求贏每一池，只追求不可被剝削。",
          "河牌下注要讓你的 bluff-catcher 痛苦。", "我把這手放進低頻率桶。", "你看不出我是價值還是空氣，這就夠了。", "這裡讓渡主動權比較平衡。", "解算器會喜歡這個尺寸。"
        ]
      }
    ];
    const PERSONALITY_BY_KEY = Object.fromEntries(AI_PERSONALITIES.map(profile => [profile.key, profile]));
    const HUMAN_PROFILE = {
      key: "human",
      label: "真人玩家",
      summary: "由你操作",
      lines: []
    };

    const state = {
      players: [],
      deck: [],
      board: [],
      dealer: -1,
      current: -1,
      pot: 0,
      street: "idle",
      currentBet: 0,
      minRaise: 50,
      smallBlind: 25,
      bigBlind: 50,
      startingStack: 2000,
      waitingHuman: false,
      handOver: true,
      fastForwardAi: false,
      message: "",
      lastWinners: [],
      dealerPortrait: "",
      handNumber: 0,
      actionNumber: 0
    };

    const els = {
      topbar: document.getElementById("topbar"),
      topbarToggle: document.getElementById("topbarToggle"),
      table: document.getElementById("table"),
      board: document.getElementById("board"),
      potText: document.getElementById("potText"),
      stageText: document.getElementById("stageText"),
      dealerPortrait: document.getElementById("dealerPortrait"),
      handTitle: document.getElementById("handTitle"),
      hintText: document.getElementById("hintText"),
      log: document.getElementById("log"),
      playerCount: document.getElementById("playerCount"),
      smallBlind: document.getElementById("smallBlind"),
      blindText: document.getElementById("blindText"),
      startingStackText: document.getElementById("startingStackText"),
      onlineHumanText: document.getElementById("onlineHumanText"),
      newGameBtn: document.getElementById("newGameBtn"),
      exportLogBtn: document.getElementById("exportLogBtn"),
      nextHandBtn: document.getElementById("nextHandBtn"),
      foldBtn: document.getElementById("foldBtn"),
      callBtn: document.getElementById("callBtn"),
      raiseBtn: document.getElementById("raiseBtn"),
      potRaiseBtn: document.getElementById("potRaiseBtn"),
      allInBtn: document.getElementById("allInBtn"),
      raiseBuilder: document.getElementById("raiseBuilder"),
      raiseToggle: document.getElementById("raiseToggle"),
      raiseTargetText: document.getElementById("raiseTargetText"),
      raiseSlider: document.getElementById("raiseSlider"),
      raiseInput: document.getElementById("raiseInput"),
      raiseHelp: document.getElementById("raiseHelp"),
      playerModal: document.getElementById("playerModal"),
      playerModalClose: document.getElementById("playerModalClose"),
      playerInfoPortrait: document.getElementById("playerInfoPortrait"),
      playerInfoName: document.getElementById("playerInfoName"),
      playerInfoMeta: document.getElementById("playerInfoMeta"),
      playerInfoPersonality: document.getElementById("playerInfoPersonality"),
      playerInfoQuotes: document.getElementById("playerInfoQuotes"),
      quickRaises: document.querySelectorAll("[data-raise-preset]")
    };

    let selectedRaiseTo = 0;
    let selectedPlayerIndex = null;

    function setTopbarCollapsed(collapsed) {
      if (!els.topbar || !els.topbarToggle) return;
      els.topbar.classList.toggle("is-collapsed", collapsed);
      els.topbarToggle.setAttribute("aria-expanded", String(!collapsed));
      els.topbarToggle.textContent = collapsed ? "設定" : "收合";
    }

    function loadRaiseBuilderCollapsed() {
      try {
        return localStorage.getItem("omaha_poker_raise_builder_collapsed") === "1";
      } catch (error) {
        return false;
      }
    }

    function setRaiseBuilderCollapsed(collapsed) {
      if (!els.raiseBuilder || !els.raiseToggle) return;
      els.raiseBuilder.classList.toggle("is-collapsed", collapsed);
      els.raiseToggle.setAttribute("aria-expanded", String(!collapsed));
      els.raiseToggle.textContent = collapsed ? "+" : "−";
      els.raiseToggle.title = collapsed ? "展開自訂大加注" : "收合自訂大加注";
      try {
        localStorage.setItem("omaha_poker_raise_builder_collapsed", collapsed ? "1" : "0");
      } catch (error) {}
    }

    function makePresenceId() {
      try {
        const key = "omaha_poker_presence_id";
        let id = sessionStorage.getItem(key);
        if (!id) {
          id = Array.from({ length: 16 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
          sessionStorage.setItem(key, id);
        }
        return id;
      } catch (error) {
        return Array.from({ length: 16 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
      }
    }

    const presenceId = makePresenceId();

    function updateOnlineHumans(count) {
      if (!els.onlineHumanText) return;
      els.onlineHumanText.textContent = Number.isFinite(count) ? `${count} 人` : "離線";
    }

    function pingPresence() {
      if (typeof fetch !== "function") return;
      fetch(`${PRESENCE_URL}?app=${encodeURIComponent(PRESENCE_APP)}&id=${encodeURIComponent(presenceId)}`, { cache: "no-store" })
        .then(response => response.json())
        .then(data => {
          if (data && Number.isFinite(data.online)) updateOnlineHumans(data.online);
        })
        .catch(() => updateOnlineHumans(NaN));
    }

    function startPresence() {
      pingPresence();
      window.setInterval(pingPresence, 10000);
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) pingPresence();
      });
    }

    function rankText(rank) {
      return RANK_TEXT[rank] || String(rank);
    }

    function money(value) {
      return Number(value).toLocaleString("zh-TW");
    }

    function cardText(card) {
      return card ? `${rankText(card.rank)}${card.suit}` : "";
    }

    function cardsText(cards) {
      return Array.isArray(cards) && cards.length ? cards.map(cardText).join(" ") : "無";
    }

    function stackSnapshot() {
      return state.players
        .map((p, i) => `${i === state.dealer ? "D " : ""}${p.name}${p.blindLabel ? " " + p.blindLabel : ""}: ${money(p.stack)}${p.streetBet ? "，本輪 " + money(p.streetBet) : ""}${p.totalBet ? "，總投入 " + money(p.totalBet) : ""}${p.folded ? "，已棄牌" : ""}`)
        .join("；");
    }

    function log(text) {
      const row = document.createElement("div");
      row.className = "log-entry";
      row.textContent = text;
      els.log.prepend(row);
    }

    function saveGameState() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          state,
          settings: {
            playerCount: els.playerCount.value,
            smallBlind: els.smallBlind.value
          },
          logEntries: Array.from(els.log.children).map(row => row.textContent)
        }));
      } catch (error) {
        console.warn("Unable to save poker game state.", error);
      }
    }

    function restoreLog(entries) {
      els.log.innerHTML = "";
      if (!Array.isArray(entries)) return;
      entries.forEach(text => {
        const row = document.createElement("div");
        row.className = "log-entry";
        row.textContent = text;
        els.log.appendChild(row);
      });
    }

    function buildExportText() {
      const lines = [];
      const exportedAt = new Date().toLocaleString("zh-TW", { hour12: false });
      lines.push("Omaha Poker 奧馬哈撲克 牌局紀錄");
      lines.push(`匯出時間：${exportedAt}`);
      lines.push(`目前手牌：第 ${state.handNumber || 0} 局`);
      lines.push(`盲注：${state.smallBlind}/${state.bigBlind}`);
      lines.push(`目前街口：${stageLabel()}`);
      lines.push(`公共牌：${cardsText(state.board)}`);
      lines.push(`底池：${money(state.pot)}`);
      lines.push("");
      lines.push("玩家狀態");
      state.players.forEach((p, i) => {
        const profile = personalityFor(p);
        lines.push([
          `座位 ${i + 1}`,
          p.name,
          i === state.dealer ? "莊家" : "",
          p.blindLabel || "",
          profile.label,
          `籌碼 ${money(p.stack)}`,
          `本輪下注 ${money(p.streetBet || 0)}`,
          `本局總投入 ${money(p.totalBet || 0)}`,
          p.folded ? "已棄牌" : (p.inHand ? "牌局中" : "未參與/已結束"),
          p.stack <= 0 ? "淘汰" : "",
          `手牌 ${cardsText(p.hand)}`
        ].filter(Boolean).join(" | "));
      });
      lines.push("");
      lines.push("完整紀錄（由舊到新）");
      const entries = Array.from(els.log.children).map(row => row.textContent).reverse();
      if (entries.length) {
        entries.forEach((entry, index) => lines.push(`${String(index + 1).padStart(3, "0")}. ${entry}`));
      } else {
        lines.push("尚無紀錄。");
      }
      return lines.join("\n");
    }

    function exportLog() {
      const text = buildExportText();
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      link.href = url;
      link.download = `omaha-poker-hand-log-${stamp}.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    function loadGameState() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (!saved || saved.version !== 1 || !saved.state || !Array.isArray(saved.state.players)) return false;

        Object.assign(state, saved.state);
        normalizePlayers();
        if (typeof state.fastForwardAi !== "boolean") state.fastForwardAi = false;
        if (!Number.isFinite(state.handNumber)) state.handNumber = 0;
        if (!Number.isFinite(state.actionNumber)) state.actionNumber = 0;
        if (saved.settings) {
          if (saved.settings.playerCount) els.playerCount.value = saved.settings.playerCount;
          if (saved.settings.smallBlind) els.smallBlind.value = saved.settings.smallBlind;
        }
        if (!Number.isFinite(state.baseSmallBlind)) {   // 舊存檔無基準 → 由設定推回，續玩才會繼續升盲
          state.baseSmallBlind = Number(saved.settings && saved.settings.smallBlind) || 25;
        }
        els.blindText.textContent = `${state.smallBlind} / ${state.bigBlind}`;
        els.startingStackText.textContent = state.startingStack;
        restoreLog(saved.logEntries);
        return true;
      } catch (error) {
        console.warn("Unable to load poker game state.", error);
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }
    }

    function makeDeck() {
      const deck = [];
      for (const suit of SUITS) {
        for (const rank of RANKS) deck.push({ suit, rank });
      }
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      return deck;
    }

    function shuffled(list) {
      const items = [...list];
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      return items;
    }

    function assignPortraits(count) {
      const portraits = shuffled(PORTRAITS);
      return {
        players: ["", ...portraits.slice(0, count - 1)],
        dealer: portraits[count - 1] || portraits[0] || ""
      };
    }

    function assignAiPersonalities(count) {
      return shuffled(AI_PERSONALITIES)
        .slice(0, Math.max(0, count - 1))
        .map(profile => profile.key);
    }

    function cardKey(card, hidden = false, index = 0) {
      return hidden ? `back-${index}` : `${card.rank}${card.suit}`;
    }

    function makeCard(card, hidden = false, index = 0) {
      const div = document.createElement("div");
      div.className = "card" + (hidden ? " back" : "") + (!hidden && (card.suit === "♥" || card.suit === "♦") ? " red" : "");
      div.dataset.cardKey = cardKey(card, hidden, index);
      if (!hidden) {
        div.innerHTML = `<span class="rank">${rankText(card.rank)}</span><span class="suit">${card.suit}</span><span class="rank bottom">${rankText(card.rank)}</span>`;
      }
      return div;
    }

    function syncCards(container, hand, hidden = false) {
      const current = Array.from(container.children).map(card => card.dataset.cardKey);
      const expected = hand.map((card, index) => cardKey(card, hidden, index));
      if (expected.length === current.length && expected.every((key, index) => key === current[index])) return;

      container.replaceChildren(...hand.map((card, index) => makeCard(card, hidden, index)));
    }

    function nextSeat(from, predicate = p => p.stack > 0) {
      for (let step = 1; step <= state.players.length; step++) {
        const idx = (from + step) % state.players.length;
        if (predicate(state.players[idx], idx)) return idx;
      }
      return -1;
    }

    function activePlayers() {
      return state.players.filter(p => p.inHand && !p.folded);
    }

    function activeCanActPlayers() {
      return state.players.filter(p => p.inHand && !p.folded && p.stack > 0);
    }

    function bettingOrder() {
      const actors = activeCanActPlayers();
      if (actors.length <= 1) return actors;
      const bb = state.players.findIndex(p => p.blindLabel === "BB" && p.inHand && !p.folded);
      const startFrom = state.street === "preflop" && bb >= 0 ? bb : state.dealer;
      const ordered = [];
      let seat = nextSeat(startFrom, p => p.inHand && !p.folded && p.stack > 0);
      while (seat >= 0 && ordered.length < actors.length) {
        ordered.push(state.players[seat]);
        seat = nextSeat(seat, p => p.inHand && !p.folded && p.stack > 0);
      }
      return ordered;
    }

    function positionAdvantage(p) {
      const order = bettingOrder();
      if (order.length <= 1) return 0;
      const index = order.indexOf(p);
      if (index < 0) return 0;
      return index / (order.length - 1);
    }

    function straightWindowPotential(ranks) {
      const unique = new Set(ranks);
      if (unique.has(14)) unique.add(1);
      let best = 0;
      for (let start = 1; start <= 10; start++) {
        let hits = 0;
        for (let rank = start; rank < start + 5; rank++) {
          if (unique.has(rank)) hits++;
        }
        if (hits >= 4) best = Math.max(best, .22);
        else if (hits === 3) best = Math.max(best, .08);
      }
      return best;
    }

    function drawPotential(p) {
      if (state.board.length < 3 || state.board.length >= 5) return 0;
      const cards = [...p.hand, ...state.board];
      const suitCounts = cards.reduce((counts, card) => {
        counts[card.suit] = (counts[card.suit] || 0) + 1;
        return counts;
      }, {});
      const holeSuitCounts = p.hand.reduce((counts, card) => {
        counts[card.suit] = (counts[card.suit] || 0) + 1;
        return counts;
      }, {});
      let flushDraw = 0;
      Object.entries(suitCounts).forEach(([suit, count]) => {
        if ((holeSuitCounts[suit] || 0) < 2) return;   // 奧馬哈：同花需底牌恰有 2 張該花色
        if (count >= 4) flushDraw = Math.max(flushDraw, .2);
        else if (count === 3 && state.board.length === 3) flushDraw = Math.max(flushDraw, .07);
      });
      const straightDraw = straightWindowPotential(cards.map(card => card.rank));
      const overcards = state.board.length > 0
        ? p.hand.filter(card => card.rank > Math.max(...state.board.map(boardCard => boardCard.rank))).length * .035
        : 0;
      return Math.min(.32, flushDraw + straightDraw + overcards);
    }

    function stageLabel() {
      return {
        idle: "準備開局",
        preflop: "翻牌前",
        flop: "翻牌圈",
        turn: "轉牌圈",
        river: "河牌圈",
        showdown: "攤牌"
      }[state.street] || "";
    }

    function personalityFor(player) {
      if (player?.personalityKey === "human") return HUMAN_PROFILE;
      return PERSONALITY_BY_KEY[player?.personalityKey] || AI_PERSONALITIES[0];
    }

    function normalizePlayers() {
      const usedPortraits = new Set();
      state.players.forEach((p, i) => {
        if (i === 0 || p.personalityKey === "human") {
          p.portrait = "";
          if (!Array.isArray(p.spokenLines)) p.spokenLines = [];
          return;
        }
        if (!PORTRAITS.includes(p.portrait) || usedPortraits.has(p.portrait)) {
          p.portrait = "";
        } else {
          usedPortraits.add(p.portrait);
        }
        if (!Array.isArray(p.spokenLines)) p.spokenLines = [];
        if (!p.personalityKey || !PERSONALITY_BY_KEY[p.personalityKey]) {
          p.personalityKey = AI_PERSONALITIES[(i - 1) % AI_PERSONALITIES.length].key;
        }
        if (typeof p.tableTalk !== "string") p.tableTalk = "";
        if (!Number.isFinite(p.talkUntil)) p.talkUntil = 0;
        if (!Number.isFinite(p.lastTalkAt)) p.lastTalkAt = 0;
        if (!Number.isFinite(p.lastTalkLine)) p.lastTalkLine = -1;
      });
      if (!PORTRAITS.includes(state.dealerPortrait) || usedPortraits.has(state.dealerPortrait)) {
        state.dealerPortrait = "";
      } else {
        usedPortraits.add(state.dealerPortrait);
      }

      const available = shuffled(PORTRAITS.filter(path => !usedPortraits.has(path)));
      state.players.forEach((p, i) => {
        if (i === 0 || p.personalityKey === "human") return;
        if (p.portrait || !available.length) return;
        p.portrait = available.shift();
      });
      if (!state.dealerPortrait && available.length) state.dealerPortrait = available.shift();
    }

    function maybeTableTalk(index, actionKind, strength, toCall) {
      const p = state.players[index];
      const profile = personalityFor(p);
      const now = Date.now();
      const isBigMoment = actionKind === "raise" || actionKind === "allin" || toCall >= state.bigBlind * 3 || strength > .82;
      const chance = isBigMoment ? .34 : .16;
      if (now - (p.lastTalkAt || 0) < 9000 || Math.random() > chance) return;

      let lineIndex = Math.floor(Math.random() * profile.lines.length);
      if (lineIndex === p.lastTalkLine) lineIndex = (lineIndex + 1) % profile.lines.length;
      p.tableTalk = profile.lines[lineIndex];
      p.lastTalkLine = lineIndex;
      p.lastTalkAt = now;
      p.talkUntil = now + 3400;
      p.spokenLines = [p.tableTalk, ...(p.spokenLines || []).filter(line => line !== p.tableTalk)].slice(0, 8);
      if (selectedPlayerIndex === index) renderPlayerInfo(index);
      setTimeout(render, 3500);
    }

    function renderPlayerInfo(index) {
      const p = state.players[index];
      if (!p) return;
      const profile = personalityFor(p);
      const isHuman = index === 0 || p.personalityKey === "human";
      els.playerInfoPortrait.hidden = isHuman;
      els.playerInfoPortrait.src = isHuman ? "" : (p.portrait || "");
      els.playerInfoPortrait.alt = isHuman ? "" : `${p.name} 頭像`;
      els.playerInfoName.textContent = p.name;
      els.playerInfoMeta.textContent = [
        index === state.dealer ? "莊家" : "",
        p.blindLabel || "",
        `籌碼 ${money(p.stack)}`
      ].filter(Boolean).join(" · ");
      els.playerInfoPersonality.textContent = `${profile.label} · ${profile.summary}`;
      els.playerInfoQuotes.innerHTML = "";
      const quotes = (p.spokenLines || []).filter(Boolean);
      if (!quotes.length) {
        const empty = document.createElement("li");
        empty.textContent = index === 0 ? "你還沒有留下牌桌發言。" : "這位玩家這局還沒開口。";
        els.playerInfoQuotes.appendChild(empty);
        return;
      }
      quotes.forEach(line => {
        const item = document.createElement("li");
        item.textContent = line;
        els.playerInfoQuotes.appendChild(item);
      });
    }

    function openPlayerInfo(index) {
      if (!state.players[index]) return;
      selectedPlayerIndex = index;
      renderPlayerInfo(index);
      els.playerModal.hidden = false;
      els.playerModalClose.focus();
    }

    function closePlayerInfo() {
      selectedPlayerIndex = null;
      els.playerModal.hidden = true;
    }

    function seatPositions(count) {
      const compact = window.matchMedia && window.matchMedia("(max-width: 820px)").matches;
      if (compact) {
        if (count === 4) return [[50, 88], [20, 50], [50, 10], [80, 50]];
        if (count === 5) return [[50, 88], [20, 64], [28, 15], [72, 15], [80, 64]];
        if (count === 6) return [[50, 88], [20, 69], [20, 29], [50, 10], [80, 29], [80, 69]];
        if (count === 7) return [[50, 88], [20, 75], [15, 47], [30, 14], [70, 14], [85, 47], [80, 75]];
        return [[50, 88], [24, 78], [12, 56], [20, 25], [50, 10], [80, 25], [88, 56], [76, 78]];
      }
      if (count === 4) return [[50, 92], [12, 50], [50, 8], [88, 50]];
      if (count === 5) return [[50, 92], [12, 62], [24, 13], [76, 13], [88, 62]];
      if (count === 6) return [[50, 92], [14, 70], [14, 27], [50, 8], [86, 27], [86, 70]];
      if (count === 7) return [[50, 92], [17, 76], [10, 45], [31, 10], [69, 10], [90, 45], [83, 76]];
      return [[50, 92], [22, 80], [9, 58], [16, 27], [50, 8], [84, 27], [91, 58], [78, 80]];
    }

    function render() {
      els.potText.textContent = money(state.pot);
      els.stageText.textContent = `${stageLabel()}${state.current >= 0 && !state.handOver ? " · 輪到 " + state.players[state.current].name : ""}`;
      els.dealerPortrait.src = state.dealerPortrait || "";
      syncCards(els.board, state.board);

      document.querySelectorAll(".round-result").forEach(node => node.remove());
      if (state.handOver && state.lastWinners.length) {
        const result = document.createElement("div");
        result.className = "round-result";
        result.innerHTML = `
          <div class="round-result-label">本局勝者</div>
          <div class="round-result-text">${state.lastWinners.map(i => state.players[i].name).join("、")}</div>
        `;
        els.table.appendChild(result);
      }
      const positions = seatPositions(state.players.length);
      state.players.forEach((p, i) => {
        const isWinner = state.lastWinners.includes(i);
        let seat = els.table.querySelector(`.seat[data-seat-index="${i}"]`);
        if (!seat) {
          seat = document.createElement("div");
          seat.dataset.seatIndex = i;
          seat.innerHTML = `
            <div class="winner-tag" hidden>贏得本局</div>
            <div class="seat-head">
              <span class="player-id">
                <span class="avatar-slot"></span>
                <span class="name"></span>
              </span>
              <span class="badges"></span>
            </div>
            <div class="cards"></div>
            <div class="stack-row"><span>籌碼</span><strong></strong></div>
            <div class="bet-row"><span>本輪下注</span><strong></strong></div>
            <div class="status"></div>
            <div class="personality"></div>
            <div class="table-talk" hidden></div>
          `;
          els.table.appendChild(seat);
        }
        seat.className = [
          "seat",
          i === 0 ? "you" : "",
          i === state.current && !state.handOver ? "active" : "",
          p.folded ? "folded" : "",
          p.stack <= 0 && !p.inHand ? "out" : "",
          isWinner ? "winner winner-flash" : ""
        ].filter(Boolean).join(" ");
        seat.style.left = positions[i][0] + "%";
        seat.style.top = positions[i][1] + "%";

        const badges = [];
        if (i === state.dealer) badges.push(`<span class="badge dealer">D</span>`);
        if (p.blindLabel) badges.push(`<span class="badge">${p.blindLabel}</span>`);

        seat.querySelector(".winner-tag").hidden = !isWinner;
        const isHuman = i === 0 || p.personalityKey === "human";
        const avatarSlot = seat.querySelector(".avatar-slot");
        if (isHuman || !p.portrait) {
          avatarSlot.replaceChildren();
        } else {
          let avatarButton = avatarSlot.querySelector(".avatar-button");
          if (!avatarButton) {
            avatarButton = document.createElement("button");
            avatarButton.className = "avatar-button";
            avatarButton.type = "button";
            avatarButton.innerHTML = `<img class="avatar" alt="">`;
            avatarSlot.appendChild(avatarButton);
          }
          const avatar = avatarButton.querySelector(".avatar");
          avatar.src = p.portrait;
          avatar.alt = `${p.name} 頭像`;
          avatarButton.dataset.playerIndex = i;
          avatarButton.ariaLabel = `查看 ${p.name} 資訊`;
        }
        seat.querySelector(".name").textContent = p.name;
        seat.querySelector(".badges").innerHTML = badges.join("");
        seat.querySelector(".stack-row strong").textContent = money(p.stack);
        seat.querySelector(".bet-row strong").textContent = money(p.streetBet);
        seat.querySelector(".status").textContent = p.status || "";
        seat.querySelector(".personality").textContent = i === 0 ? "" : `${personalityFor(p).label} · ${personalityFor(p).summary}`;
        const talk = seat.querySelector(".table-talk");
        const talking = i !== 0 && p.tableTalk && Date.now() < (p.talkUntil || 0);
        talk.hidden = !talking;
        talk.textContent = talking ? p.tableTalk : "";
        const cards = seat.querySelector(".cards");
        syncCards(cards, p.hand, i !== 0 && !state.handOver && !p.revealed);
      });
      document.querySelectorAll(".seat").forEach(node => {
        if (Number(node.dataset.seatIndex) >= state.players.length) node.remove();
      });

      const hero = state.players[0];
      if (hero && hero.hand.length) {
        const best = bestOmahaHand(hero.hand, state.board);
        els.handTitle.textContent = state.board.length >= 3 ? `你的牌型：${HAND_NAMES[best.score[0]]}（用 ${best.cards.slice(0, 2).map(c => rankText(c.rank) + c.suit).join(" ")} + 公牌）` : `你的手牌：${hero.hand.map(c => rankText(c.rank) + c.suit).join(" ")}`;
      }
      els.hintText.textContent = state.message || "輪到你時可選擇棄牌、跟注、加注或 All-in。";

      updateButtons();
      if (selectedPlayerIndex !== null && !els.playerModal.hidden) {
        if (state.players[selectedPlayerIndex]) {
          renderPlayerInfo(selectedPlayerIndex);
        } else {
          closePlayerInfo();
        }
      }
      saveGameState();
    }

    function getRaiseBounds() {
      const hero = state.players[0];
      if (!hero) {
        return { toCall: 0, minTo: 0, maxTo: 0, canRaise: false, fullRaiseAvailable: false };
      }

      const toCall = Math.max(0, state.currentBet - hero.streetBet);
      const minRaise = Math.max(state.bigBlind, state.minRaise);
      const minTo = state.currentBet + minRaise;
      const maxTo = hero.streetBet + hero.stack;
      return {
        toCall,
        minTo,
        maxTo,
        canRaise: hero.stack > toCall && maxTo > state.currentBet,
        fullRaiseAvailable: maxTo >= minTo
      };
    }

    function normalizeRaiseTarget(value) {
      const bounds = getRaiseBounds();
      if (!bounds.canRaise) return bounds.maxTo;

      let target = Number(value);
      if (!Number.isFinite(target)) target = bounds.fullRaiseAvailable ? bounds.minTo : bounds.maxTo;
      target = Math.round(target);
      target = Math.min(bounds.maxTo, Math.max(state.currentBet + 1, target));
      if (bounds.fullRaiseAvailable && target < bounds.minTo) target = bounds.minTo;
      if (!bounds.fullRaiseAvailable) target = bounds.maxTo;
      return target;
    }

    function setRaiseTarget(value) {
      selectedRaiseTo = normalizeRaiseTarget(value);
      syncRaiseControls();
    }

    function presetRaiseTarget(preset) {
      const hero = state.players[0];
      const bounds = getRaiseBounds();
      if (!hero || !bounds.canRaise) return bounds.maxTo;

      if (preset === "2x") return Math.max(bounds.minTo, state.currentBet * 2 || state.bigBlind);
      if (preset === "3x") return Math.max(bounds.minTo, state.currentBet * 3 || state.bigBlind * 2);
      if (preset === "half-pot") return Math.max(bounds.minTo, state.currentBet + Math.ceil((state.pot + bounds.toCall) / 2));
      if (preset === "all-in") return bounds.maxTo;
      return bounds.minTo;
    }

    function syncRaiseControls() {
      const bounds = getRaiseBounds();
      selectedRaiseTo = normalizeRaiseTarget(selectedRaiseTo);
      const disabled = !bounds.canRaise;
      const step = 1;
      const sliderMin = bounds.fullRaiseAvailable ? bounds.minTo : Math.max(0, bounds.maxTo);
      const sliderMax = Math.max(sliderMin, bounds.maxTo);

      els.raiseSlider.min = sliderMin;
      els.raiseSlider.max = sliderMax;
      els.raiseSlider.step = step;
      els.raiseSlider.value = Math.min(sliderMax, Math.max(sliderMin, selectedRaiseTo));
      els.raiseSlider.disabled = disabled;

      els.raiseInput.min = sliderMin;
      els.raiseInput.max = sliderMax;
      els.raiseInput.step = step;
      els.raiseInput.value = disabled ? 0 : selectedRaiseTo;
      els.raiseInput.disabled = disabled;

      els.raiseTargetText.textContent = disabled ? "加注到 0" : `加注到 ${money(selectedRaiseTo)}`;
      els.raiseHelp.textContent = disabled
        ? "目前不能加注。"
        : `可用範圍：${money(sliderMin)} - ${money(sliderMax)}${bounds.fullRaiseAvailable ? "" : "（籌碼不足時只能 All-in）"}`;
      els.quickRaises.forEach(button => {
        button.disabled = disabled;
      });
    }

    function updateButtons() {
      const hero = state.players[0];
      const isHumanTurn = state.waitingHuman && state.current === 0 && hero && hero.inHand && !hero.folded && hero.stack > 0;
      const toCall = hero ? Math.max(0, state.currentBet - hero.streetBet) : 0;
      const raiseBounds = getRaiseBounds();
      if (isHumanTurn && raiseBounds.canRaise) {
        setRaiseTarget(selectedRaiseTo || raiseBounds.minTo);
      } else {
        syncRaiseControls();
      }
      els.foldBtn.disabled = !isHumanTurn;
      els.callBtn.disabled = !isHumanTurn;
      els.raiseBtn.disabled = !isHumanTurn || !raiseBounds.canRaise;
      els.potRaiseBtn.disabled = !isHumanTurn || !raiseBounds.canRaise;
      els.allInBtn.disabled = !isHumanTurn || !hero || hero.stack <= 0;
      els.nextHandBtn.disabled = !state.handOver;
      els.callBtn.textContent = toCall > 0 ? `跟注 ${money(Math.min(toCall, hero?.stack || 0))}` : "過牌";
      els.raiseBtn.textContent = raiseBounds.canRaise ? `加注到 ${money(selectedRaiseTo)}` : "加注";
      els.potRaiseBtn.textContent = "大加注";
    }

    function postBet(player, amount) {
      const paid = Math.max(0, Math.min(amount, player.stack));
      player.stack -= paid;
      player.streetBet += paid;
      player.totalBet += paid;
      state.pot += paid;
      if (player.stack === 0 && player.inHand && !player.folded) player.status = "All-in";
      return paid;
    }

    function startNewGame() {
      state.smallBlind = Number(els.smallBlind.value);
      state.bigBlind = state.smallBlind * 2;
      state.baseSmallBlind = state.smallBlind;   // 升盲基準（盲注遞增用）
      state.minRaise = state.bigBlind;
      state.startingStack = state.bigBlind * 40;
      els.blindText.textContent = `${state.smallBlind} / ${state.bigBlind}`;
      els.startingStackText.textContent = state.startingStack;
      const count = Number(els.playerCount.value);
      const names = ["你", "電腦 A", "電腦 B", "電腦 C", "電腦 D", "電腦 E", "電腦 F", "電腦 G"];
      const portraits = assignPortraits(count);
      const aiPersonalityKeys = assignAiPersonalities(count);
      state.players = Array.from({ length: count }, (_, i) => ({
        name: names[i],
        personalityKey: i === 0 ? "human" : aiPersonalityKeys[i - 1],
        portrait: portraits.players[i],
        stack: state.startingStack,
        hand: [],
        streetBet: 0,
        totalBet: 0,
        folded: false,
        inHand: false,
        acted: false,
        status: "",
        blindLabel: "",
        revealed: false,
        tableTalk: "",
        talkUntil: 0,
        lastTalkAt: 0,
        lastTalkLine: -1,
        spokenLines: []
      }));
      state.dealer = -1;
      state.dealerPortrait = portraits.dealer;
      state.pot = 0;
      state.handOver = true;
      state.lastWinners = [];
      state.handNumber = 0;
      state.actionNumber = 0;
      els.log.innerHTML = "";
      log(`新牌桌開始：${count} 人，盲注 ${state.smallBlind}/${state.bigBlind}，起始籌碼 ${state.startingStack}`);
      startHand();
    }

    function resetPlayerForHand(p) {
      p.hand = [];
      p.streetBet = 0;
      p.totalBet = 0;
      p.folded = false;
      p.inHand = p.stack > 0;
      p.acted = false;
      p.status = p.stack > 0 ? "" : "淘汰";
      p.blindLabel = "";
      p.revealed = false;
      p.tableTalk = "";
      p.talkUntil = 0;
    }

    // ── 盲注遞增（錦標賽式）：每 BLIND_LEVEL_HANDS 局升一級，讓籌碼相對變淺、逼出結尾 ──
    const BLIND_LEVEL_HANDS = 8;                                  // 每幾局漲一次盲
    const BLIND_FACTORS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256];
    function currentBlindLevel(handNo) {
      return Math.min(BLIND_FACTORS.length - 1,
                      Math.floor(Math.max(0, (handNo || 1) - 1) / BLIND_LEVEL_HANDS));
    }
    function applyBlindLevel() {
      const base = state.baseSmallBlind || state.smallBlind || 25;
      const lvl = currentBlindLevel(state.handNumber);
      const sb = base * BLIND_FACTORS[lvl];
      const prevSb = state.smallBlind;
      state.smallBlind = sb;
      state.bigBlind = sb * 2;
      state.minRaise = state.bigBlind;
      if (els.blindText) {
        const atCap = lvl >= BLIND_FACTORS.length - 1;
        const nextAt = (lvl + 1) * BLIND_LEVEL_HANDS + 1;
        els.blindText.textContent = `${state.smallBlind} / ${state.bigBlind}`
          + (atCap ? "（已達頂級）" : `（第 ${nextAt} 局漲盲）`);
      }
      if (sb !== prevSb && state.handNumber > 1) {
        log(`⏫ 盲注升級：小盲 ${money(prevSb)} → ${money(sb)}，大盲 ${money(sb * 2)}（第 ${state.handNumber} 局起）`);
      }
    }

    function startHand() {
      const liveCount = state.players.filter(p => p.stack > 0).length;
      if (liveCount < 2) {
        state.message = state.players[0].stack > 0 ? "你贏下整張牌桌。" : "你的籌碼歸零，請開新牌桌。";
        state.handOver = true;
        render();
        return;
      }

      state.deck = makeDeck();
      state.board = [];
      state.pot = 0;
      state.street = "preflop";
      state.currentBet = 0;
      state.minRaise = state.bigBlind;
      selectedRaiseTo = 0;
      state.handNumber = (state.handNumber || 0) + 1;
      applyBlindLevel();                 // 依局數套用當前盲注等級（每 8 局升一級）
      state.actionNumber = 0;
      state.handOver = false;
      state.waitingHuman = false;
      state.fastForwardAi = false;
      state.lastWinners = [];
      state.players.forEach(resetPlayerForHand);
      state.dealer = nextSeat(state.dealer, p => p.stack > 0);

      for (let cardNo = 0; cardNo < 4; cardNo++) {   // 奧馬哈：每人發 4 張底牌
        state.players.forEach(p => {
          if (p.inHand) p.hand.push(state.deck.pop());
        });
      }

      const sb = nextSeat(state.dealer, p => p.inHand);
      const bb = nextSeat(sb, p => p.inHand);
      state.players[sb].blindLabel = "SB";
      state.players[bb].blindLabel = "BB";
      postBet(state.players[sb], state.smallBlind);
      postBet(state.players[bb], state.bigBlind);
      state.currentBet = Math.max(state.players[sb].streetBet, state.players[bb].streetBet);
      state.players[sb].status = `小盲 ${money(state.smallBlind)}`;
      state.players[bb].status = `大盲 ${money(state.bigBlind)}`;
      state.current = nextSeat(bb, p => p.inHand && !p.folded && p.stack > 0);
      state.message = "新一局開始。";
      log(`第 ${state.handNumber} 局開始：莊家 ${state.players[state.dealer].name}；小盲 ${state.players[sb].name} ${money(state.smallBlind)}；大盲 ${state.players[bb].name} ${money(state.bigBlind)}；翻牌前第一個行動 ${state.players[state.current]?.name || "無"}`);
      log(`第 ${state.handNumber} 局手牌：你 ${cardsText(state.players[0].hand)}；其他玩家手牌於本局結束或匯出紀錄中揭露`);
      log(`第 ${state.handNumber} 局起始籌碼：${stackSnapshot()}；底池 ${money(state.pot)}`);
      render();
      animateCards();
      continueGame();
    }

    function animateCards(targets = ".card") {
      if (!window.anime) return;
      anime({
        targets,
        scale: [0.84, 1],
        opacity: [0, 1],
        translateY: [12, 0],
        delay: anime.stagger(28),
        duration: 360,
        easing: "easeOutCubic"
      });
    }

    function bettingComplete() {
      const contenders = activePlayers();
      if (contenders.length <= 1) return true;
      const actors = activeCanActPlayers();
      if (actors.length === 0) return true;
      if (actors.length === 1) return actors[0].streetBet === state.currentBet;
      return actors.every(p => p.acted && p.streetBet === state.currentBet);
    }

    function shouldShowdownNow() {
      return state.street === "river";
    }

    async function continueGame() {
      render();
      await sleep(150);

      if (activePlayers().length === 1) {
        awardSingleWinner();
        return;
      }

      if (bettingComplete()) {
        await advanceStreet();
        return;
      }

      if (state.current < 0 || !state.players[state.current].inHand || state.players[state.current].folded || state.players[state.current].stack <= 0) {
        state.current = nextSeat(state.current, p => p.inHand && !p.folded && p.stack > 0);
        continueGame();
        return;
      }

      if (state.current === 0) {
        state.waitingHuman = true;
        state.message = "輪到你行動。";
        render();
        return;
      }

      state.waitingHuman = false;
      await aiAction(state.current);
      state.current = nextSeat(state.current, p => p.inHand && !p.folded && p.stack > 0);
      continueGame();
    }

    async function advanceStreet() {
      if (shouldShowdownNow()) {
        showdown();
        return;
      }

      state.players.forEach(p => {
        p.streetBet = 0;
        p.acted = false;
        p.blindLabel = "";
        if (p.inHand && !p.folded && p.stack > 0) p.status = "";
      });
      state.currentBet = 0;
      state.minRaise = state.bigBlind;
      selectedRaiseTo = 0;

      let newBoardCards = 0;
      if (state.street === "preflop") {
        state.board.push(state.deck.pop(), state.deck.pop(), state.deck.pop());
        state.street = "flop";
        newBoardCards = 3;
        log(`第 ${state.handNumber} 局翻牌：${cardsText(state.board)}；底池 ${money(state.pot)}；籌碼 ${stackSnapshot()}`);
      } else if (state.street === "flop") {
        state.board.push(state.deck.pop());
        state.street = "turn";
        newBoardCards = 1;
        log(`第 ${state.handNumber} 局轉牌：${cardText(state.board[3])}；公共牌 ${cardsText(state.board)}；底池 ${money(state.pot)}；籌碼 ${stackSnapshot()}`);
      } else if (state.street === "turn") {
        state.board.push(state.deck.pop());
        state.street = "river";
        newBoardCards = 1;
        log(`第 ${state.handNumber} 局河牌：${cardText(state.board[4])}；公共牌 ${cardsText(state.board)}；底池 ${money(state.pot)}；籌碼 ${stackSnapshot()}`);
      }

      state.current = nextSeat(state.dealer, p => p.inHand && !p.folded && p.stack > 0);
      state.message = `${stageLabel()}開始。`;
      render();
      animateCards(`.board .card:nth-last-child(-n+${newBoardCards})`);
      await sleep(state.fastForwardAi ? STREET_DELAY.folded : STREET_DELAY.normal);
      continueGame();
    }

    function playerAction(kind, raiseBy = 0) {
      if (!state.waitingHuman || state.current !== 0) return;
      state.waitingHuman = false;
      applyAction(0, kind, raiseBy);
      if (kind === "fold") {
        state.fastForwardAi = true;
        state.message = "你已棄牌，電腦快速結算本局。";
      }
      state.current = nextSeat(0, p => p.inHand && !p.folded && p.stack > 0);
      continueGame();
    }

    function playerRaiseTo(target) {
      const normalizedTarget = normalizeRaiseTarget(target);
      if (normalizedTarget <= state.currentBet) return;
      playerAction("raise", normalizedTarget - state.currentBet);
    }

    function applyAction(index, kind, raiseBy = 0) {
      const p = state.players[index];
      const toCall = Math.max(0, state.currentBet - p.streetBet);
      const actionNo = (state.actionNumber || 0) + 1;
      const street = stageLabel();
      const board = cardsText(state.board);
      const stackBefore = p.stack;
      const streetBetBefore = p.streetBet;
      const potBefore = state.pot;
      const writeActionLog = (summary, extra = "") => {
        state.actionNumber = actionNo;
        log(`第 ${state.handNumber} 局 #${actionNo} ${street}｜${p.name} ${summary}｜需跟 ${money(toCall)}｜本輪 ${money(streetBetBefore)} -> ${money(p.streetBet)}｜籌碼 ${money(stackBefore)} -> ${money(p.stack)}｜底池 ${money(potBefore)} -> ${money(state.pot)}｜公共牌 ${board}${extra ? "｜" + extra : ""}`);
      };
      if (kind === "fold") {
        p.folded = true;
        p.acted = true;
        p.status = "棄牌";
        writeActionLog("棄牌");
        return;
      }

      if (kind === "allin") {
        const oldBet = state.currentBet;
        const paid = postBet(p, p.stack);
        p.acted = true;
        p.status = `All-in ${money(p.streetBet)}`;
        if (p.streetBet > oldBet) {
          state.minRaise = Math.max(state.bigBlind, p.streetBet - oldBet);
          state.currentBet = p.streetBet;
          markOthersUnacted(index);
        }
        writeActionLog(`All-in，投入 ${money(paid)}`, `目前最高下注 ${money(state.currentBet)}；最小再加注 ${money(state.minRaise)}`);
        return;
      }

      if (kind === "call") {
        const paid = postBet(p, toCall);
        p.acted = true;
        p.status = toCall > 0 ? `跟注 ${money(paid)}` : "過牌";
        writeActionLog(toCall > 0 ? `跟注，投入 ${money(paid)}` : "過牌");
        return;
      }

      if (kind === "raise") {
        const oldBet = state.currentBet;
        const targetBet = oldBet + Math.max(state.minRaise, raiseBy);
        const needed = Math.max(0, targetBet - p.streetBet);
        const paid = postBet(p, needed);
        p.acted = true;
        if (p.streetBet > oldBet) {
          state.minRaise = Math.max(state.bigBlind, p.streetBet - oldBet);
          state.currentBet = p.streetBet;
          p.status = p.stack === 0 ? `All-in ${money(p.streetBet)}` : `加注到 ${money(p.streetBet)}`;
          markOthersUnacted(index);
          writeActionLog(`${p.stack === 0 ? "All-in 加注" : "加注"}到 ${money(p.streetBet)}`, `目前最高下注 ${money(state.currentBet)}；最小再加注 ${money(state.minRaise)}`);
        } else {
          p.status = `跟注 ${money(paid)}`;
          writeActionLog(`跟注，投入 ${money(paid)}`);
        }
      }
    }

    function markOthersUnacted(raiser) {
      state.players.forEach((p, i) => {
        if (i !== raiser && p.inHand && !p.folded && p.stack > 0) p.acted = false;
      });
    }

    async function aiAction(index) {
      const p = state.players[index];
      const [minDelay, maxDelay] = state.fastForwardAi ? AI_DELAY.folded : AI_DELAY.normal;
      await sleep(minDelay + Math.random() * (maxDelay - minDelay));
      const profile = personalityFor(p);
      const config = profile.config;
      const toCall = Math.max(0, state.currentBet - p.streetBet);
      const strength = estimateStrength(p);
      const draw = drawPotential(p);
      const position = positionAdvantage(p);
      const equityPressure = draw * (.55 + position * .55);
      const pressure = toCall / Math.max(1, p.stack + p.streetBet);
      const stackPressure = p.stack / Math.max(1, state.bigBlind);
      const random = Math.random();
      let actionKind = "call";
      let raiseBy = 0;

      if (toCall === 0) {
        const trapStrongHand = strength > .78 && Math.random() < config.trapCall;
        const raiseLine = .68 + config.checkRaise - equityPressure * .35 - position * .04;
        const bluffCheck = Math.random() < config.bluff && state.board.length > 0 && activePlayers().length <= 3;
        const lateDrawRaise = position > .62 && draw > .12 && Math.random() < .34 + position * .2;
        if (!trapStrongHand && p.stack > state.bigBlind && (strength + equityPressure > raiseLine || bluffCheck || lateDrawRaise) && random > .24) {
          actionKind = stackPressure <= 8 && strength > .52 && Math.random() < config.allInGamble ? "allin" : "raise";
          raiseBy = chooseRaise(p, strength, profile, draw, position);
        } else {
          actionKind = "call";
        }
        maybeTableTalk(index, actionKind, strength, toCall);
        applyAction(index, actionKind, raiseBy);
        render();
        return;
      }

      if (toCall >= p.stack) {
        actionKind = strength > .58 + config.panicFold || random < .08 + config.allInGamble ? "allin" : "fold";
        maybeTableTalk(index, actionKind, strength, toCall);
        applyAction(index, actionKind);
        render();
        return;
      }

      const shortStackPush = stackPressure <= 9 && strength > .45 && Math.random() < config.allInGamble;
      const callLine = .28 + pressure * .8 + config.callBias;
      const raiseLine = .73 + pressure * .35 + config.raiseBias - equityPressure * .45 - position * .05;
      const loosePeel = Math.random() < config.randomCall;
      const bluffRaise = Math.random() < config.bluff && pressure < .22 && activePlayers().length <= 3;
      const lateDrawRaise = position > .62 && draw > .12 && pressure < .34 && Math.random() < .3 + position * .18;
      if (shortStackPush && p.stack > toCall) {
        actionKind = "allin";
      } else if (strength < callLine && !loosePeel) {
        actionKind = "fold";
      } else if ((strength + equityPressure > raiseLine || bluffRaise || lateDrawRaise) && p.stack > toCall + state.bigBlind && random > .18) {
        actionKind = "raise";
        raiseBy = chooseRaise(p, strength, profile, draw, position);
      } else {
        actionKind = "call";
      }
      maybeTableTalk(index, actionKind, strength, toCall);
      applyAction(index, actionKind, raiseBy);
      render();
    }

    // 奧馬哈翻牌前手牌強度：重視對子、雙同花、連張與高牌協調性
    function omahaPreflopStrength(hole) {
      if (!Array.isArray(hole) || hole.length < 4) return .3;
      const ranks = hole.map(c => c.rank).sort((a, b) => b - a);
      const suits = hole.map(c => c.suit);
      let value = (ranks[0] - 2) / 12 * .16 + (ranks[1] - 2) / 12 * .1;

      const rankCounts = {};
      ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
      Object.entries(rankCounts).forEach(([rank, count]) => {
        if (count >= 2) value += .11 + (Number(rank) - 2) / 12 * .16;   // 對子（越大越好）
        if (count >= 3) value -= .1;                                     // 三張同點 → 有張是死牌
      });

      const suitCounts = {};
      suits.forEach(s => suitCounts[s] = (suitCounts[s] || 0) + 1);
      let doubleSuited = 0;
      Object.values(suitCounts).forEach(count => {
        if (count === 2) { value += .06; doubleSuited++; }
        else if (count >= 3) value += .01;                               // 3+ 同花色多為死牌
      });
      if (doubleSuited === 2) value += .05;                              // 雙同花加成

      const uniq = [...new Set(ranks)].sort((a, b) => a - b);
      if (uniq.length >= 3) {
        const span = uniq[uniq.length - 1] - uniq[0];
        if (span <= 3) value += .1;
        else if (span <= 5) value += .05;
      }
      return Math.min(.95, value + Math.random() * .06);
    }

    function estimateStrength(p) {
      if (state.board.length === 0) {
        return omahaPreflopStrength(p.hand);
      }
      const best = bestOmahaHand(p.hand, state.board).score;
      const category = best[0];
      let value = category / 8;
      value += Math.min(.18, (best[1] || 0) / 90);
      if (category >= 4) value += .18;
      if (category >= 6) value += .18;
      return Math.min(.99, value + Math.random() * .1);
    }

    function chooseRaise(p, strength, profile = AI_PERSONALITIES[0], draw = 0, position = 0) {
      const scale = profile.config.raiseScale || 1;
      const aggression = .48 + strength * .55 + draw * .28 + position * .08;
      const potSized = Math.max(state.bigBlind, Math.round((state.pot * aggression * scale) / state.bigBlind) * state.bigBlind);
      return Math.min(Math.max(state.minRaise, potSized), p.stack);
    }

    function awardSingleWinner() {
      const winner = activePlayers()[0];
      const idx = state.players.indexOf(winner);
      const potWon = state.pot;
      winner.stack += state.pot;
      state.lastWinners = [idx];
      log(`第 ${state.handNumber} 局完整手牌：${state.players.filter(p => p.hand.length).map(p => `${p.name} ${cardsText(p.hand)}`).join("；")}`);
      log(`第 ${state.handNumber} 局結束：${winner.name} 因其他玩家棄牌贏得底池 ${money(potWon)}；公共牌 ${cardsText(state.board)}；勝者手牌 ${cardsText(winner.hand)}；結束籌碼 ${stackSnapshot()}`);
      state.message = `${winner.name} 贏得 ${money(potWon)}。`;
      state.pot = 0;
      finishHand();
    }

    function showdown() {
      state.street = "showdown";
      state.players.forEach(p => {
        if (p.inHand && !p.folded) p.revealed = true;
      });
      const contenders = activePlayers();
      const ranked = contenders.map(p => ({
        player: p,
        index: state.players.indexOf(p),
        best: bestOmahaHand(p.hand, state.board)
      }));
      log(`第 ${state.handNumber} 局攤牌：公共牌 ${cardsText(state.board)}；底池 ${money(state.pot)}`);
      ranked.forEach(r => {
        log(`第 ${state.handNumber} 局攤牌牌型：${r.player.name} 手牌 ${cardsText(r.player.hand)}，最佳牌 ${cardsText(r.best.cards)}，${scoreText(r.best.score)}`);
      });
      settlePots(ranked);
      finishHand();
    }

    function settlePots(ranked) {
      const levels = [...new Set(state.players.filter(p => p.totalBet > 0).map(p => p.totalBet))].sort((a, b) => a - b);
      let previous = 0;
      const bestShowdownScore = ranked
        .map(r => r.best.score)
        .sort((a, b) => compareScore(b, a))[0];
      const showdownWinners = ranked.filter(r => compareScore(r.best.score, bestShowdownScore) === 0);

      levels.forEach(level => {
        const eligibleContributors = state.players.filter(p => p.totalBet >= level);
        const potAmount = (level - previous) * eligibleContributors.length;
        const eligibleRanked = ranked.filter(r => r.player.totalBet >= level && !r.player.folded);
        if (potAmount <= 0 || eligibleRanked.length === 0) {
          previous = level;
          return;
        }

        if (eligibleRanked.length === 1) {
          const sole = eligibleRanked[0];
          sole.player.stack += potAmount;
          const foldedMoneyInLayer = eligibleContributors.some(p => p.folded);
          log(`第 ${state.handNumber} 局分池：${sole.player.name} ${foldedMoneyInLayer ? "贏得邊池" : "收回未被跟注籌碼"} ${money(potAmount)}；可競爭玩家 ${eligibleRanked.map(r => r.player.name).join("、")}`);
          previous = level;
          return;
        }

        eligibleRanked.sort((a, b) => compareScore(b.best.score, a.best.score));
        const top = eligibleRanked[0].best.score;
        const potWinners = eligibleRanked.filter(r => compareScore(r.best.score, top) === 0);
        const share = Math.floor(potAmount / potWinners.length);
        let remainder = potAmount - share * potWinners.length;
        potWinners.forEach(r => {
          r.player.stack += share + (remainder > 0 ? 1 : 0);
          if (remainder > 0) remainder--;
        });
        log(`第 ${state.handNumber} 局分池：${potWinners.map(r => r.player.name).join("、")} 以 ${scoreText(top)} 贏得 ${money(potAmount)}；每人 ${money(share)}${potWinners.length > 1 ? "（餘數由前位玩家取得）" : ""}`);
        previous = level;
      });

      state.lastWinners = showdownWinners.map(r => r.index);
      const names = state.lastWinners.map(i => state.players[i].name).join("、");
      state.message = `${names} 以 ${scoreText(bestShowdownScore)} 贏得本局。`;
      log(`第 ${state.handNumber} 局完整手牌：${state.players.filter(p => p.hand.length).map(p => `${p.name} ${cardsText(p.hand)}`).join("；")}`);
      log(`第 ${state.handNumber} 局結束：${names} 以 ${scoreText(bestShowdownScore)} 贏得本局；結束籌碼 ${stackSnapshot()}`);
      state.pot = 0;
    }

    function finishHand() {
      state.handOver = true;
      state.waitingHuman = false;
      state.current = -1;
      state.players.forEach(p => {
        p.inHand = false;
        p.streetBet = 0;
        p.totalBet = 0;
        p.blindLabel = "";
        if (p.stack <= 0) p.status = "淘汰";
      });
      render();
      animateCards();
    }

    function scoreFive(cards) {
      const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
      const suits = cards.map(c => c.suit);
      const flush = suits.every(s => s === suits[0]);
      const unique = [...new Set(ranks)].sort((a, b) => b - a);
      const wheel = unique.includes(14) && unique.includes(5) && unique.includes(4) && unique.includes(3) && unique.includes(2);
      let straightHigh = 0;
      if (wheel) straightHigh = 5;
      for (let i = 0; i <= unique.length - 5; i++) {
        if (unique[i] - unique[i + 4] === 4) {
          straightHigh = Math.max(straightHigh, unique[i]);
        }
      }

      const counts = {};
      ranks.forEach(r => counts[r] = (counts[r] || 0) + 1);
      const groups = Object.entries(counts)
        .map(([rank, count]) => ({ rank: Number(rank), count }))
        .sort((a, b) => b.count - a.count || b.rank - a.rank);

      if (flush && straightHigh) return [8, straightHigh];
      if (groups[0].count === 4) return [7, groups[0].rank, groups.find(g => g.count === 1).rank];
      if (groups[0].count === 3 && groups[1].count === 2) return [6, groups[0].rank, groups[1].rank];
      if (flush) return [5, ...ranks];
      if (straightHigh) return [4, straightHigh];
      if (groups[0].count === 3) {
        return [3, groups[0].rank, ...groups.filter(g => g.count === 1).map(g => g.rank).sort((a, b) => b - a)];
      }
      if (groups[0].count === 2 && groups[1].count === 2) {
        const pairs = groups.filter(g => g.count === 2).map(g => g.rank).sort((a, b) => b - a);
        return [2, ...pairs, groups.find(g => g.count === 1).rank];
      }
      if (groups[0].count === 2) {
        return [1, groups[0].rank, ...groups.filter(g => g.count === 1).map(g => g.rank).sort((a, b) => b - a)];
      }
      return [0, ...ranks];
    }

    function compareScore(a, b) {
      const len = Math.max(a.length, b.length);
      for (let i = 0; i < len; i++) {
        const av = a[i] || 0;
        const bv = b[i] || 0;
        if (av > bv) return 1;
        if (av < bv) return -1;
      }
      return 0;
    }

    function rankList(ranks) {
      return ranks.map(rankText).join("、");
    }

    function scoreText(score) {
      const [category, ...values] = score;
      switch (category) {
        case 8:
          return `同花順 ${rankText(values[0])} 高`;
        case 7:
          return `四條 ${rankText(values[0])}，角牌 ${rankText(values[1])}`;
        case 6:
          return `葫蘆 ${rankText(values[0])} 帶 ${rankText(values[1])}`;
        case 5:
          return `同花 ${rankList(values)}`;
        case 4:
          return `順子 ${rankText(values[0])} 高`;
        case 3:
          return `三條 ${rankText(values[0])}，角牌 ${rankList(values.slice(1))}`;
        case 2:
          return `兩對 ${rankText(values[0])}、${rankText(values[1])}，角牌 ${rankText(values[2])}`;
        case 1:
          return `一對 ${rankText(values[0])}，角牌 ${rankList(values.slice(1))}`;
        default:
          return `高牌 ${rankList(values)}`;
      }
    }

    function bestHand(cards) {
      if (cards.length < 5) return { score: [0, ...cards.map(c => c.rank).sort((a, b) => b - a)], cards };
      let best = null;
      for (let a = 0; a < cards.length - 4; a++) {
        for (let b = a + 1; b < cards.length - 3; b++) {
          for (let c = b + 1; c < cards.length - 2; c++) {
            for (let d = c + 1; d < cards.length - 1; d++) {
              for (let e = d + 1; e < cards.length; e++) {
                const combo = [cards[a], cards[b], cards[c], cards[d], cards[e]];
                const score = scoreFive(combo);
                if (!best || compareScore(score, best.score) > 0) best = { score, cards: combo };
              }
            }
          }
        }
      }
      return best;
    }

    // ── 奧馬哈成手：必須「恰好 2 張底牌 + 3 張公共牌」 ──
    const OMAHA_HOLE_PAIRS = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];   // C(4,2)
    const OMAHA_BOARD_TRIPLES = (() => {                                          // C(board,3)
      const triples = [];
      for (let i = 0; i < 5; i++)
        for (let j = i + 1; j < 5; j++)
          for (let k = j + 1; k < 5; k++) triples.push([i, j, k]);
      return triples;
    })();

    function bestOmahaHand(hole, board) {
      const holes = Array.isArray(hole) ? hole : [];
      if (!Array.isArray(board) || board.length < 3) {
        // 翻牌前尚無足夠公共牌，回傳以底牌高低排序的暫時分數（僅供顯示/比較占位）
        return { score: [0, ...holes.map(c => c.rank).sort((a, b) => b - a)], cards: holes.slice() };
      }
      let best = null;
      for (const [h1, h2] of OMAHA_HOLE_PAIRS) {
        if (h2 >= holes.length) continue;
        for (const [b1, b2, b3] of OMAHA_BOARD_TRIPLES) {
          if (b3 >= board.length) continue;                    // 翻牌 3 張 / 轉牌 4 張時略過越界組合
          const combo = [holes[h1], holes[h2], board[b1], board[b2], board[b3]];
          const score = scoreFive(combo);
          if (!best || compareScore(score, best.score) > 0) best = { score, cards: combo };
        }
      }
      return best || { score: [0, ...holes.map(c => c.rank).sort((a, b) => b - a)], cards: holes.slice() };
    }

    function card(rank, suit = "♠") {
      return { rank, suit };
    }

    function runPokerRuleChecks() {
      // 奧馬哈核心規則：必須恰好用 2 張底牌
      const flushBoard = [card(14, "♠"), card(13, "♠"), card(12, "♠"), card(5, "♠"), card(2, "♥")];
      const oneSpade = bestOmahaHand([card(11, "♠"), card(3, "♦"), card(4, "♦"), card(6, "♣")], flushBoard).score;
      console.assert(
        oneSpade[0] !== 5 && oneSpade[0] !== 8,
        "奧馬哈：底牌只有一張同花色，不能與檯面湊成同花。",
        oneSpade
      );
      const twoSpade = bestOmahaHand([card(11, "♠"), card(10, "♠"), card(3, "♦"), card(4, "♦")], flushBoard).score;
      console.assert(
        twoSpade[0] === 8,
        "奧馬哈：底牌兩張黑桃 J/10 可與檯面 A/K/Q 黑桃組成同花順（皇家）。",
        twoSpade
      );

      // 檯面已有四條時，玩家仍須用 2 張底牌 → 不能白吃檯面四條
      const quadBoard = [card(9, "♠"), card(9, "♥"), card(9, "♦"), card(9, "♣"), card(3, "♠")];
      const noFreeQuads = bestOmahaHand([card(14, "♠"), card(13, "♥"), card(7, "♦"), card(6, "♣")], quadBoard).score;
      console.assert(
        noFreeQuads[0] !== 7,
        "奧馬哈：檯面四條時，玩家必用 2 張底牌，不會直接拿到四條。",
        noFreeQuads
      );

      // 角牌比較仍需正確：兩人同用檯面對 7，A/K vs A/Q 應由角牌分勝負
      const pairBoard = [card(7, "♠"), card(7, "♥"), card(10, "♦"), card(8, "♣"), card(3, "♠")];
      const akHand = bestOmahaHand([card(14, "♣"), card(13, "♦"), card(5, "♥"), card(4, "♦")], pairBoard).score;
      const aqHand = bestOmahaHand([card(14, "♠"), card(12, "♣"), card(5, "♦"), card(4, "♥")], pairBoard).score;
      console.assert(
        compareScore(akHand, aqHand) > 0,
        "奧馬哈：同用檯面對 7，A/K 角牌應勝過 A/Q。",
        akHand,
        aqHand
      );

      const assignedPersonalities = assignAiPersonalities(6);
      console.assert(
        assignedPersonalities.length === 5 && new Set(assignedPersonalities).size === 5,
        "新牌桌應只抽出對應座位數量的 AI 人格，且同桌不重複。",
        assignedPersonalities
      );

      const savedPlayers = state.players;
      const savedStreet = state.street;
      const savedCurrentBet = state.currentBet;

      state.players = [
        { inHand: true, folded: false, stack: 0, acted: true, streetBet: 100 },
        { inHand: true, folded: false, stack: 0, acted: true, streetBet: 100 }
      ];
      state.currentBet = 100;
      state.street = "flop";
      console.assert(
        bettingComplete() && !shouldShowdownNow(),
        "兩名以上玩家 all-in 時，flop 後應繼續發 turn / river，不能直接攤牌。"
      );

      state.players = [
        { inHand: true, folded: false, stack: 0, acted: true, streetBet: 100 },
        { inHand: true, folded: false, stack: 300, acted: false, streetBet: 50 }
      ];
      state.currentBet = 100;
      console.assert(
        !bettingComplete(),
        "唯一還能行動的玩家若尚未跟平目前下注，仍必須先行動。"
      );

      state.players = savedPlayers;
      state.street = savedStreet;
      state.currentBet = savedCurrentBet;
    }

    runPokerRuleChecks();

    els.topbarToggle.addEventListener("click", () => {
      setTopbarCollapsed(!els.topbar.classList.contains("is-collapsed"));
    });
    els.raiseToggle.addEventListener("click", () => {
      setRaiseBuilderCollapsed(!els.raiseBuilder.classList.contains("is-collapsed"));
    });
    els.newGameBtn.addEventListener("click", () => {
      if (window.matchMedia && window.matchMedia("(max-width: 820px)").matches) setTopbarCollapsed(true);
      startNewGame();
    });
    els.exportLogBtn.addEventListener("click", exportLog);
    els.nextHandBtn.addEventListener("click", startHand);
    els.foldBtn.addEventListener("click", () => playerAction("fold"));
    els.callBtn.addEventListener("click", () => playerAction("call"));
    els.raiseBtn.addEventListener("click", () => playerRaiseTo(selectedRaiseTo));
    els.potRaiseBtn.addEventListener("click", () => {
      const hero = state.players[0];
      if (!hero) return;
      const toCall = Math.max(0, state.currentBet - hero.streetBet);
      playerRaiseTo(state.currentBet + Math.max(state.minRaise, state.pot + toCall));
    });
    els.allInBtn.addEventListener("click", () => playerAction("allin"));
    els.table.addEventListener("click", event => {
      const button = event.target.closest(".avatar-button");
      if (!button) return;
      openPlayerInfo(Number(button.dataset.playerIndex));
    });
    els.table.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const button = event.target.closest(".avatar-button");
      if (!button) return;
      event.preventDefault();
      openPlayerInfo(Number(button.dataset.playerIndex));
    });
    els.playerModalClose.addEventListener("click", closePlayerInfo);
    els.playerModal.addEventListener("click", event => {
      if (event.target === els.playerModal) closePlayerInfo();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !els.playerModal.hidden) closePlayerInfo();
    });
    els.quickRaises.forEach(button => {
      button.addEventListener("click", () => setRaiseTarget(presetRaiseTarget(button.dataset.raisePreset)));
    });
    els.raiseSlider.addEventListener("input", () => setRaiseTarget(els.raiseSlider.value));
    els.raiseInput.addEventListener("input", () => setRaiseTarget(els.raiseInput.value));
    els.raiseInput.addEventListener("change", () => setRaiseTarget(els.raiseInput.value));
    els.smallBlind.addEventListener("change", () => {
      const sb = Number(els.smallBlind.value);
      els.blindText.textContent = `${sb} / ${sb * 2}`;
      els.startingStackText.textContent = sb * 80;
      saveGameState();
    });

    const isCompactViewport = window.matchMedia && window.matchMedia("(max-width: 820px)").matches;
    setRaiseBuilderCollapsed(isCompactViewport || loadRaiseBuilderCollapsed());

    if (loadGameState()) {
      render();
      if (!state.handOver && !state.waitingHuman) continueGame();
    } else {
      updateButtons();
    }
    startPresence();
  </script>
</body>
</html>
