<?php
// auto-tower 線上人數
// 行為：
//   GET /api/presence.php?id=<16-32 hex>&app=<slug>  → 記錄該 session 的心跳，回 { online: N }
//   GET /api/presence.php?app=<slug>                  → 只查詢，回 { online: N }
// 安全：
//   - id 嚴格白名單 ^[a-f0-9]{16,32}$
//   - app 限制 ^[a-z0-9_-]{1,32}$，避免 path traversal
//   - 只在 /tmp 操作單一檔案，無 exec/include 動態檔名
//   - 30 秒 TTL 自動清理過期，總上限 500 防 DoS

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');

$id  = isset($_GET['id'])  ? $_GET['id']  : '';
$app = isset($_GET['app']) ? $_GET['app'] : 'default';

// 嚴格白名單
if (!preg_match('/^[a-z0-9_-]{1,32}$/', $app)) {
  http_response_code(400);
  echo json_encode(['error' => 'bad_app']);
  exit;
}
if ($id !== '' && !preg_match('/^[a-f0-9]{16,32}$/', $id)) {
  http_response_code(400);
  echo json_encode(['error' => 'bad_id']);
  exit;
}

$file = '/tmp/at_presence_' . $app . '.json';
$now  = time();
$TTL  = 30;     // 秒
$MAX  = 500;

$fp = @fopen($file, file_exists($file) ? 'r+' : 'c+');
if (!$fp && file_exists($file)) {
  $fp = @fopen($file, 'r+');
}
if (!$fp) {
  error_log('presence fs_open failed: ' . $file);
  http_response_code(500);
  echo json_encode(['error' => 'fs_open']);
  exit;
}
@chmod($file, 0666);
if (!flock($fp, LOCK_EX)) {
  fclose($fp);
  http_response_code(500);
  echo json_encode(['error' => 'fs_lock']);
  exit;
}

$raw  = stream_get_contents($fp);
$data = json_decode($raw !== false && $raw !== '' ? $raw : '{}', true);
if (!is_array($data)) $data = [];

// 寫入這次心跳
if ($id !== '') $data[$id] = $now;

// 清過期
foreach ($data as $k => $t) {
  if (!is_int($t) || $now - $t > $TTL) unset($data[$k]);
}

// 上限保護
if (count($data) > $MAX) {
  asort($data);
  $data = array_slice($data, -$MAX, null, true);
}

// 回寫
ftruncate($fp, 0);
rewind($fp);
fwrite($fp, json_encode($data));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

echo json_encode(['online' => count($data)]);
