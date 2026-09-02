<?php
// 宿舍人生 — 伺服器時間同步端點
// 所有訪客以此標準時間推導同一個確定性世界（角色位置、行程、對話）
header('Content-Type: application/json');
header('Cache-Control: no-store');
echo json_encode([
  'now' => microtime(true),   // 伺服器 Unix 時間（秒，含小數）
  'tz'  => 'UTC',
]);
