<?php
// auto-tower 多國語系（中 / 英 / 日 / 韓）
// 偵測順序：?lang= → cookie → Accept-Language → zh
$SUPPORTED = ['zh', 'en', 'ja', 'ko'];
$lang = 'zh';

if (isset($_GET['lang']) && in_array($_GET['lang'], $SUPPORTED, true)) {
  $lang = $_GET['lang'];
  setcookie('tower_lang', $lang, time() + 86400 * 180, '/');
} elseif (isset($_COOKIE['tower_lang']) && in_array($_COOKIE['tower_lang'], $SUPPORTED, true)) {
  $lang = $_COOKIE['tower_lang'];
} elseif (!empty($_SERVER['HTTP_ACCEPT_LANGUAGE'])) {
  $al = strtolower($_SERVER['HTTP_ACCEPT_LANGUAGE']);
  if (preg_match('/^zh|,zh|;zh/', $al))      $lang = 'zh';
  elseif (strpos($al, 'ja') !== false)       $lang = 'ja';
  elseif (strpos($al, 'ko') !== false)       $lang = 'ko';
  else                                       $lang = 'en';
}

// 字典；zh 為 sketch.js 原文 fallback，故略
$DICT = [
  'en' => [
    // === HTML / Buttons ===
    'New Tower' => 'New Tower',
    'Speed'     => 'Speed',
    'Zoom'      => 'Zoom',

    // === HUD ===
    '在樓人數'   => 'Population',
    '辦公'       => 'Office',
    '購物'       => 'Shop',
    '娛樂'       => 'Cinema',
    '住客'       => 'Guests',
    '員工'       => 'Staff',
    '建造中'     => 'Building',
    '營運中'     => 'Live',
    '速度'       => 'Speed',
    '累計入場'   => 'Total entries',
    '線上'       => 'Online',
    '抱怨'       => 'Complaints',
    '最熱樓層'   => 'Busiest floor',
    '人'         => '',

    // === Panel labels ===
    '格'             => 'cells',
    '× 點外面關閉'   => '× tap outside to close',
    '車位佔用'       => 'Slots used',
    '目前在內'       => 'Currently inside',
    '今日進出'       => 'Today',
    '累計人次'       => 'Total visits',
    '累計營收'       => 'Total revenue',
    '車'             => 'cars',
    '容量'           => 'Capacity',
    '今日訪客'       => 'Visitors today',
    '累計訪客'       => 'Total visitors',
    '今日營收'       => 'Revenue today',
    '顧客評價'       => 'Reviews',
    '暫無評價'       => 'No reviews yet',
    '則'             => 'reviews',
    '（還沒有訪客留下感想）' => '(No visitor comments yet)',

    // === Unit names (17) ===
    '辦公室'   => 'Office',
    '商店'     => 'Shop',
    '地下街'   => 'Underground',
    '電影院'   => 'Cinema',
    '地鐵站'   => 'Subway',
    '清運中心' => 'Garbage',
    '監控室'   => 'Security',
    '大廳'     => 'Lobby',
    '餐廳'     => 'Restaurant',
    '健身房'   => 'Gym',
    '停車場'   => 'Parking',
    '機房'     => 'Mech',
    '旅店客房' => 'Hotel Room',
    '飯店接待' => 'Reception',
    '洗衣店'   => 'Laundry',
    '游泳池'   => 'Pool',
    'SPA 中心' => 'Spa',

    // === Time slots (7) ===
    '清晨'       => 'Early',
    '上午'       => 'Morning',
    '午餐時段'   => 'Lunch',
    '下午'       => 'Afternoon',
    '傍晚下班'   => 'Evening',
    '夜間'       => 'Night',
    '深夜'       => 'Late Night',
  ],

  'ja' => [
    // === HTML / Buttons ===
    'New Tower' => '新ビル',
    'Speed'     => '速度',
    'Zoom'      => 'ズーム',

    // === HUD ===
    '在樓人數'   => '在館人数',
    '辦公'       => 'オフィス',
    '購物'       => 'ショップ',
    '娛樂'       => '映画館',
    '住客'       => '宿泊客',
    '員工'       => 'スタッフ',
    '建造中'     => '建設中',
    '營運中'     => '営業中',
    '速度'       => '速度',
    '累計入場'   => '累計入場',
    '線上'       => 'オンライン',
    '抱怨'       => '苦情',
    '最熱樓層'   => '混雑フロア',
    '人'         => '人',

    // === Panel labels ===
    '格'             => 'マス',
    '× 點外面關閉'   => '× 外側タップで閉じる',
    '車位佔用'       => '駐車枠',
    '目前在內'       => '現在の人数',
    '今日進出'       => '本日入退場',
    '累計人次'       => '累計人数',
    '累計營收'       => '累計売上',
    '車'             => '台',
    '容量'           => '定員',
    '今日訪客'       => '本日来館',
    '累計訪客'       => '累計来館',
    '今日營收'       => '本日売上',
    '顧客評價'       => 'レビュー',
    '暫無評價'       => 'レビューなし',
    '則'             => '件',
    '（還沒有訪客留下感想）' => '（まだレビューはありません）',

    // === Unit names (17) ===
    '辦公室'   => 'オフィス',
    '商店'     => 'ショップ',
    '地下街'   => '地下街',
    '電影院'   => '映画館',
    '地鐵站'   => '地下鉄駅',
    '清運中心' => 'ごみ集積',
    '監控室'   => '警備室',
    '大廳'     => 'ロビー',
    '餐廳'     => 'レストラン',
    '健身房'   => 'ジム',
    '停車場'   => '駐車場',
    '機房'     => '機械室',
    '旅店客房' => 'ホテル客室',
    '飯店接待' => 'フロント',
    '洗衣店'   => 'ランドリー',
    '游泳池'   => 'プール',
    'SPA 中心' => 'スパ',

    // === Time slots (7) ===
    '清晨'       => '早朝',
    '上午'       => '午前',
    '午餐時段'   => 'ランチタイム',
    '下午'       => '午後',
    '傍晚下班'   => '夕方退勤',
    '夜間'       => '夜',
    '深夜'       => '深夜',
  ],

  'ko' => [
    // === HTML / Buttons ===
    'New Tower' => '새 빌딩',
    'Speed'     => '속도',
    'Zoom'      => '줌',

    // === HUD ===
    '在樓人數'   => '빌딩 인원',
    '辦公'       => '사무',
    '購物'       => '쇼핑',
    '娛樂'       => '영화',
    '住客'       => '투숙객',
    '員工'       => '직원',
    '建造中'     => '건설 중',
    '營運中'     => '운영 중',
    '速度'       => '속도',
    '累計入場'   => '누적 입장',
    '線上'       => '온라인',
    '抱怨'       => '불만',
    '最熱樓層'   => '인기 층',
    '人'         => '명',

    // === Panel labels ===
    '格'             => '칸',
    '× 點外面關閉'   => '× 바깥 클릭하여 닫기',
    '車位佔用'       => '주차 점유',
    '目前在內'       => '현재 인원',
    '今日進出'       => '오늘 출입',
    '累計人次'       => '누적 인원',
    '累計營收'       => '누적 매출',
    '車'             => '대',
    '容量'           => '정원',
    '今日訪客'       => '오늘 방문',
    '累計訪客'       => '누적 방문',
    '今日營收'       => '오늘 매출',
    '顧客評價'       => '리뷰',
    '暫無評價'       => '리뷰 없음',
    '則'             => '개',
    '（還沒有訪客留下感想）' => '(아직 방문자 리뷰가 없습니다)',

    // === Unit names (17) ===
    '辦公室'   => '사무실',
    '商店'     => '상점',
    '地下街'   => '지하상가',
    '電影院'   => '영화관',
    '地鐵站'   => '지하철역',
    '清運中心' => '쓰레기 처리',
    '監控室'   => '보안실',
    '大廳'     => '로비',
    '餐廳'     => '레스토랑',
    '健身房'   => '헬스장',
    '停車場'   => '주차장',
    '機房'     => '기계실',
    '旅店客房' => '호텔 객실',
    '飯店接待' => '프런트',
    '洗衣店'   => '세탁소',
    '游泳池'   => '수영장',
    'SPA 中心' => '스파',

    // === Time slots (7) ===
    '清晨'       => '새벽',
    '上午'       => '오전',
    '午餐時段'   => '점심시간',
    '下午'       => '오후',
    '傍晚下班'   => '저녁 퇴근',
    '夜間'       => '저녁',
    '深夜'       => '심야',
  ],
];

$dict = ($lang !== 'zh' && isset($DICT[$lang])) ? $DICT[$lang] : null;

// 標題與描述（按語系）
$TITLES = [
  'zh' => 'Auto Tower — 生成藝術',
  'en' => 'Auto Tower — Generative Art',
  'ja' => 'Auto Tower — ジェネラティブアート',
  'ko' => 'Auto Tower — 제너러티브 아트',
];
$DESCS = [
  'zh' => '自動經營的 Yoot Tower / SimTower 高樓模擬。B10~20F 共 31 層，含辦公、商店、餐廳、健身房、電影院、旅店、SPA、停車場、地鐵站等。16 部電梯（含 skip-stop 高速井）、雙向電扶梯、行人 AI、日夜與天氣循環。',
  'en' => 'Self-running Yoot Tower / SimTower simulator. 31 floors from B10 to 20F: offices, shops, restaurants, gym, cinema, hotel, spa, parking, subway. 16 elevators (with skip-stop expresses), two-way escalators, pedestrian AI, day/night cycle and weather.',
  'ja' => 'ザ・タワー / SimTower 風の自動経営高層ビルシミュレータ。B10～20F の 31 階に、オフィス、ショップ、レストラン、ジム、映画館、ホテル、スパ、駐車場、地下鉄駅。16 基のエレベーター(スキップストップ高速含む)、双方向エスカレーター、来館者 AI、昼夜と天候のサイクル。',
  'ko' => '요트 타워 / SimTower 스타일의 자동 운영 고층 빌딩 시뮬레이터. B10~20F의 31층에 사무실, 상점, 레스토랑, 헬스장, 영화관, 호텔, 스파, 주차장, 지하철역. 엘리베이터 16대(스킵스톱 고속 포함), 양방향 에스컬레이터, 행인 AI, 주야 사이클과 날씨.',
];
$BTN = [
  'New Tower' => $dict['New Tower'] ?? 'New Tower',
  'Speed'     => $dict['Speed']     ?? 'Speed',
  'Zoom'      => $dict['Zoom']      ?? 'Zoom',
];
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($lang === 'zh' ? 'zh-Hant' : $lang) ?>">
<head>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-3GP0KMK7NS"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-3GP0KMK7NS');
  </script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="icon" type="image/svg+xml" href="../favicon.svg">
  <title><?= htmlspecialchars($TITLES[$lang]) ?></title>
  <meta name="description" content="<?= htmlspecialchars($DESCS[$lang]) ?>">
  <meta name="author" content="kvzhuang">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      background: #0d1117;
      width: 100%; height: 100%;
      overflow: hidden;
      font-family: -apple-system, "Helvetica Neue", "Noto Sans TC", "Noto Sans JP", "Noto Sans KR", sans-serif;
    }
    main { overflow: hidden; display: flex; justify-content: center; align-items: center; max-width: 100vw; height: calc(100vh - 52px); }
    main canvas { display: block; max-width: 100%; max-height: 100%; }
    #controls { display: flex; justify-content: center; gap: 12px; padding: 10px; align-items: center; }
    #controls button {
      padding: 12px 24px; border: none; border-radius: 8px;
      font-size: 15px; font-weight: 600; color: #fff;
      cursor: pointer; -webkit-tap-highlight-color: transparent;
    }
    #controls button:active { opacity: 0.7; }
    #btn-new   { background: #34C759; color: #fff; }
    #btn-speed { background: #FF9500; color: #fff; }
    #btn-zoom  { background: #5856D6; color: #fff; }
    #lang-switch {
      display: flex; gap: 4px; margin-left: 8px;
    }
    #lang-switch a {
      font-size: 11px; padding: 4px 8px; border-radius: 999px;
      background: #1e1e30; color: #8888cc; border: 1px solid #2a2a44;
      text-decoration: none; letter-spacing: 0.04em;
    }
    #lang-switch a.active {
      background: #3a3a66; color: #fff; border-color: #5555aa;
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>
  <script>
    window.LANG = '<?= htmlspecialchars($lang) ?>';
    <?php if ($dict !== null): ?>
    window.I18N = <?= json_encode($dict, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?>;
    <?php endif; ?>
  </script>
</head>
<body>
  <main id="tower-container"></main>
  <div id="controls">
    <button id="btn-new"><?= htmlspecialchars($BTN['New Tower']) ?></button>
    <button id="btn-speed"><?= htmlspecialchars($BTN['Speed']) ?></button>
    <button id="btn-zoom"><?= htmlspecialchars($BTN['Zoom']) ?></button>
    <nav id="lang-switch" aria-label="Language">
      <?php foreach ($SUPPORTED as $L):
        $label = ['zh'=>'中','en'=>'EN','ja'=>'日','ko'=>'한'][$L];
        $active = $L === $lang ? ' class="active"' : '';
      ?>
      <a href="?lang=<?= $L ?>"<?= $active ?>><?= $label ?></a>
      <?php endforeach; ?>
    </nav>
  </div>
  <script src="sketch.js?v=20260527i18n"></script>
</body>
</html>
