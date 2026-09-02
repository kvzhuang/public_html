<?php
// 相聲電台 —— 依 id 串流 mp3（不暴露原始路徑；支援 HTTP Range 讓拖曳/seek）
declare(strict_types=1);

$ROOT = '/home/ubuntu/talkshow/相聲';
$CATALOG = __DIR__ . '/data/catalog.json';

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) { http_response_code(400); exit('bad id'); }

$data = json_decode(@file_get_contents($CATALOG), true);
if (!$data || empty($data['tracks'])) { http_response_code(500); exit('no catalog'); }

$rel = null;
foreach ($data['tracks'] as $t) {
    if ((int)$t['id'] === $id) { $rel = $t['rel']; break; }
}
if ($rel === null) { http_response_code(404); exit('not found'); }

// 防路徑遍歷：解析後必須落在 ROOT 內
$path = $ROOT . '/' . $rel;
$real = realpath($path);
$rroot = realpath($ROOT);
if ($real === false || strpos($real, $rroot) !== 0 || !is_file($real)) {
    http_response_code(404); exit('missing');
}

$size = filesize($real);
$fp = fopen($real, 'rb');
if (!$fp) { http_response_code(500); exit('open fail'); }

$start = 0; $end = $size - 1;
header('Content-Type: audio/mpeg');
header('Accept-Ranges: bytes');
header('Cache-Control: public, max-age=86400');

if (isset($_SERVER['HTTP_RANGE']) &&
    preg_match('/bytes=(\d*)-(\d*)/', $_SERVER['HTTP_RANGE'], $m)) {
    if ($m[1] !== '') $start = (int)$m[1];
    if ($m[2] !== '') $end = (int)$m[2];
    if ($start > $end || $start >= $size) {
        header('Content-Range: bytes */' . $size);
        http_response_code(416); fclose($fp); exit;
    }
    http_response_code(206);
    header("Content-Range: bytes $start-$end/$size");
} else {
    http_response_code(200);
}

$length = $end - $start + 1;
header('Content-Length: ' . $length);

fseek($fp, $start);
$buf = 8192;
$remain = $length;
while ($remain > 0 && !feof($fp)) {
    $read = ($remain > $buf) ? $buf : $remain;
    echo fread($fp, $read);
    $remain -= $read;
    flush();
}
fclose($fp);
