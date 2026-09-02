<?php
// 即時聽眾：client 每隔數秒回報心跳(帶 playing 狀態)，回傳目前「正在收聽」人數。
// 以檔案 + flock 記錄，無需資料庫；過期(TTL)自動移除。
declare(strict_types=1);
header('Content-Type: application/json');
header('Cache-Control: no-store');

$F = __DIR__ . '/data/presence.json';
$TTL = 40;                      // 40 秒沒心跳視為離開
$now = time();
$id = preg_replace('/[^a-zA-Z0-9]/', '', $_GET['id'] ?? '');
$playing = (($_GET['playing'] ?? '') === '1') ? 1 : 0;

$fp = @fopen($F, 'c+');
if (!$fp) { echo json_encode(['count' => 0]); exit; }
flock($fp, LOCK_EX);
$raw = stream_get_contents($fp);
$data = json_decode($raw ?: '[]', true);
if (!is_array($data)) $data = [];

if ($id !== '') $data[$id] = ['ts' => $now, 'p' => $playing];

$count = 0;
foreach ($data as $k => $v) {
    if (($v['ts'] ?? 0) < $now - $TTL) { unset($data[$k]); continue; }
    if (($v['p'] ?? 0) == 1) $count++;
}

ftruncate($fp, 0); rewind($fp);
fwrite($fp, json_encode($data));
flock($fp, LOCK_UN); fclose($fp);

echo json_encode(['count' => $count]);
