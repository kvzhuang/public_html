<?php
// bears-life-pets API — by-user 寵物小屋
// GET             → 有養寵物的主人清單（大廳門牌）
// GET ?u=名字     → 該主人的角色資料＋寵物＋保管區（stash）裝備
// POST action=feed&pet_id=N → 投餵：寫入獨立佇列 web_feed_queue.db，由 bot 每 60s 套用
//
// 鐵律：game.db 一律 SQLITE_OPEN_READONLY；寫入只碰獨立的 web_feed_queue.db。
// pets.updated_at / created_at 是 naive UTC（db.py 用 datetime.utcnow()）。

date_default_timezone_set('UTC');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

$GAME_DB  = '/home/ubuntu/wan-xiong/data/game.db';
$QUEUE_DB = '/home/ubuntu/wan-xiong/data/web_feed_queue.db';

// 拍板：投餵無冷卻、吃飽也能餵（engine 套用時 cap 100），只留每 IP 日上限防腳本
const H_DECAY         = 1.2;    // 與 engine._PET_H_DECAY 相同（僅供前端 age_h 參考，POST 不再用飽食拒絕）
const FEED_DAILY_CAP  = 200;    // 每 IP 每日上限（台灣日界線）

function out($arr, $code = 200) {
    http_response_code($code);
    echo json_encode($arr, JSON_UNESCAPED_UNICODE);
    exit;
}

function game_db($path) {
    return new PDO('sqlite:' . $path, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::SQLITE_ATTR_OPEN_FLAGS => PDO::SQLITE_OPEN_READONLY,
    ]);
}

function client_ip() {
    // 若前面有 Cloudflare/proxy 以其標頭為準，否則用直連位址
    foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR'] as $k) {
        if (!empty($_SERVER[$k])) return trim(explode(',', $_SERVER[$k])[0]);
    }
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

function pet_row($r) {
    $ts = strtotime(($r['updated_at'] ?: $r['created_at']) . ' UTC');
    return [
        'id'         => (int)$r['id'],
        'type'       => $r['type'],
        'name'       => $r['name'],
        'hunger'     => (float)$r['hunger'],
        'mood'       => (float)$r['mood'],
        'bond'       => (int)$r['bond'],
        'bond_lv'    => intdiv((int)$r['bond'], 100),
        'age_h'      => $ts ? round(max(0, (time() - $ts) / 3600.0), 3) : 0,
        'created_at' => $r['created_at'],
    ];
}

try {
    $pdo = game_db($GAME_DB);
    $pdo->exec('PRAGMA query_only = 1');

    // ── POST：投餵 ─────────────────────────────────────────
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (($_POST['action'] ?? '') !== 'feed') out(['ok' => false, 'error' => 'bad_action'], 400);
        $pid = (int)($_POST['pet_id'] ?? 0);
        $st = $pdo->prepare("SELECT * FROM pets WHERE id = ?");
        $st->execute([$pid]);
        $pet = $st->fetch();
        if (!$pet) out(['ok' => false, 'error' => 'not_found'], 404);

        $q = new PDO('sqlite:' . $QUEUE_DB, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $q->exec('PRAGMA busy_timeout = 3000');

        // 每 IP 日上限（無冷卻、吃飽也能餵；engine 套用時 hunger cap 100）
        $ip = client_ip();
        $st = $q->prepare("SELECT COUNT(*) AS n FROM feeds
                            WHERE ip = ? AND date(created_at) = date(datetime('now','+8 hours'))");
        $st->execute([$ip]);
        if ((int)$st->fetch()['n'] >= FEED_DAILY_CAP)
            out(['ok' => false, 'error' => 'daily_cap', 'msg' => '今天投餵太多次啦，明天再來！']);

        $st = $q->prepare("INSERT INTO feeds (pet_id, ip) VALUES (?, ?)");
        $st->execute([$pid, $ip]);
        out(['ok' => true, 'gain' => 6, 'cooldown' => 0,
             'msg' => '投餵成功！約 1 分鐘內生效（+6 飽食）']);
    }

    // ── GET ?u=名字：單一主人小屋 ──────────────────────────
    $u = trim($_GET['u'] ?? '');
    if ($u !== '') {
        $st = $pdo->prepare("SELECT id, name, class, level, created_at, COALESCE(home_lv,1) AS home_lv FROM characters WHERE name = ?");
        $st->execute([$u]);
        $c = $st->fetch();
        if (!$c) out(['ok' => false, 'error' => 'no_char'], 404);
        $home_lv = max(1, min(5, (int)$c['home_lv']));
        $pet_cap = 3 + $home_lv - 1;

        $st = $pdo->prepare("SELECT * FROM pets WHERE char_id = ? ORDER BY id");
        $st->execute([$c['id']]);
        $pets = array_map('pet_row', $st->fetchAll());

        $st = $pdo->prepare("SELECT item_id, quantity, enhance_level FROM inventories
                              WHERE character_id = ? AND stash = 1 ORDER BY item_id");
        $st->execute([$c['id']]);
        $stash = array_map(fn($r) => [
            'item_id' => (int)$r['item_id'],
            'qty'     => (int)$r['quantity'],
            'enh'     => (int)$r['enhance_level'],
        ], $st->fetchAll());

        $vault = [];
        try {
            $st = $pdo->prepare("SELECT item_id, quantity, stored_at FROM vault WHERE character_id=? ORDER BY id");
            $st->execute([$c['id']]);
            $vault = array_map(fn($r) => [
                'item_id' => (int)$r['item_id'],
                'qty'     => (int)$r['quantity'],
                'stored_at' => $r['stored_at'],
            ], $st->fetchAll());
        } catch (Exception $e) {}

        $furniture = [];
        try {
            $st = $pdo->prepare("SELECT furn_id FROM home_furniture WHERE char_id=? ORDER BY bought_at, furn_id");
            $st->execute([$c['id']]);
            $furniture = array_map(fn($r) => $r['furn_id'], $st->fetchAll());
        } catch (Exception $e) {}

        // 💘 青春物語：羈絆相框（chapter>=10 的線）＋窗景燈光（星璃線 >=5）。
        // 尊重 /lovehide：user_prefs.lovehide=1 時完全不輸出。
        $romance = ['frames' => [], 'window_light' => false];
        try {
            $st = $pdo->prepare(
                "SELECT COALESCE(up.lovehide, 0) AS hide FROM characters ch " .
                "LEFT JOIN user_prefs up ON up.telegram_id = ch.telegram_id WHERE ch.id = ?");
            $st->execute([$c['id']]);
            $hide = (int)($st->fetch()['hide'] ?? 0);
            if (!$hide) {
                $st = $pdo->prepare("SELECT npc, chapter FROM romance_progress WHERE char_id = ?");
                $st->execute([$c['id']]);
                foreach ($st->fetchAll() as $r) {
                    if ((int)$r['chapter'] >= 10) $romance['frames'][] = $r['npc'];
                    if ($r['npc'] === 'xingli' && (int)$r['chapter'] >= 5) {
                        $h = (int)gmdate('H') + 8;   // 台北時間
                        $h = $h >= 24 ? $h - 24 : $h;
                        if ($h >= 20 || $h < 2) $romance['window_light'] = true;
                    }
                }
            }
        } catch (Exception $e) {}

        // 🧭 尋寶奇譚：通關（chapter>=6）→ 客廳展示戰利品。
        // compass 走 treasure_progress；第二部三線走 treasure_lines。relics 收已通關的線。
        $treasure = ['done' => false, 'relics' => []];
        try {
            $st = $pdo->prepare("SELECT chapter FROM treasure_progress WHERE char_id = ?");
            $st->execute([$c['id']]);
            $r = $st->fetch();
            if ($r && (int)$r['chapter'] >= 6) { $treasure['done'] = true; $treasure['relics'][] = 'compass'; }
        } catch (Exception $e) {}
        try {
            $st = $pdo->prepare("SELECT line, chapter FROM treasure_lines WHERE char_id = ?");
            $st->execute([$c['id']]);
            foreach ($st->fetchAll() as $r) {
                if ((int)$r['chapter'] >= 6) $treasure['relics'][] = $r['line'];
            }
        } catch (Exception $e) {}

        out(['ok' => true, 'server_time' => date('c'),
             'owner' => ['name' => $c['name'], 'class' => $c['class'], 'level' => (int)$c['level'],
                         'home_lv' => $home_lv, 'pet_cap' => $pet_cap],
             'home_lv' => $home_lv, 'pet_cap' => $pet_cap,
             'pets' => $pets, 'stash' => $stash, 'vault' => $vault, 'furniture' => $furniture,
             'romance' => $romance, 'treasure' => $treasure]);
    }

    // ── GET：大廳門牌（有養寵物的主人）─────────────────────
    $rows = $pdo->query(
        "SELECT c.name, c.class, c.level, GROUP_CONCAT(p.type) AS types, COUNT(*) AS n
           FROM pets p JOIN characters c ON c.id = p.char_id
          GROUP BY p.char_id ORDER BY c.name"
    )->fetchAll();
    $owners = array_map(fn($r) => [
        'name' => $r['name'], 'class' => $r['class'], 'level' => (int)$r['level'],
        'types' => explode(',', $r['types']), 'n' => (int)$r['n'],
    ], $rows);
    out(['ok' => true, 'owners' => $owners]);
} catch (Exception $e) {
    out(['ok' => false, 'error' => 'db_unavailable'], 500);
}
