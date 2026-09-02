<?php
declare(strict_types=1);

date_default_timezone_set('Asia/Taipei');

const GRAPHQL_ENDPOINT = 'https://citybus.taichung.gov.tw/ebus/graphql';
const SOURCE_KEY = 'taichung';
const SOURCE_NAME = '台中市';
const TAICHUNG_BOUNDS = [
    'minLat' => 23.98,
    'maxLat' => 24.45,
    'minLng' => 120.45,
    'maxLng' => 121.05,
];

if (isset($_GET['api']) || isset($_GET['action'])) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');

    $cacheDir = __DIR__ . '/cache';
    if (!is_dir($cacheDir)) {
        mkdir($cacheDir, 0775, true);
    }

    $action = (string) ($_GET['api'] ?? $_GET['action'] ?? 'live');

    try {
        if ($action === 'routes') {
            json_response(get_routes($cacheDir));
        }

        if ($action === 'shape') {
            $routeId = isset($_GET['routeId']) ? (string) $_GET['routeId'] : '';
            json_response(get_shape($routeId, $cacheDir));
        }

        json_response(get_live($cacheDir));
    } catch (Throwable $error) {
        http_response_code(502);
        json_response([
            'ok' => false,
            'error' => $error->getMessage(),
        ]);
    }
}

function json_response(array $payload): void
{
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function cache_json(string $key, int $ttl, string $cacheDir, callable $loader): array
{
    $cacheFile = $cacheDir . '/' . preg_replace('/[^a-z0-9_.-]/i', '_', $key) . '.json';
    if (is_file($cacheFile) && (time() - filemtime($cacheFile) < $ttl)) {
        $cached = file_get_contents($cacheFile);
        if ($cached !== false) {
            $json = json_decode($cached, true);
            if (is_array($json)) {
                return $json;
            }
        }
    }

    $json = $loader();
    file_put_contents($cacheFile, json_encode($json, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
    return $json;
}

function graphql_request(string $query): array
{
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'timeout' => 18,
            'header' => "Content-Type: application/json\r\nUser-Agent: taichung-bus-gen-art/1.0\r\n",
            'content' => json_encode(['query' => $query], JSON_UNESCAPED_SLASHES),
        ],
    ]);

    $body = file_get_contents(GRAPHQL_ENDPOINT, false, $context);
    if ($body === false) {
        throw new RuntimeException('Cannot fetch Taichung bus GraphQL');
    }
    $json = json_decode($body, true);
    if (!is_array($json)) {
        throw new RuntimeException('Cannot parse Taichung bus GraphQL');
    }
    if (($json['errors'] ?? []) !== []) {
        throw new RuntimeException((string) ($json['errors'][0]['message'] ?? 'Taichung bus GraphQL error'));
    }
    return $json;
}

function routes_query(): string
{
    return <<<'GRAPHQL'
{
  routes(lang: "zh") {
    edges {
      node {
        id
        name
        departure
        destination
        description
        opType
        providers {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    }
  }
}
GRAPHQL;
}

function get_routes(string $cacheDir): array
{
    $routeData = cache_json('taichung_routes', 86400, $cacheDir, static fn (): array => graphql_request(routes_query()));
    $routes = [];

    foreach (($routeData['data']['routes']['edges'] ?? []) as $edge) {
        $route = $edge['node'] ?? [];
        $rawId = (int) ($route['id'] ?? 0);
        if ($rawId <= 0) {
            continue;
        }

        $providers = [];
        foreach (($route['providers']['edges'] ?? []) as $providerEdge) {
            $providerName = trim((string) ($providerEdge['node']['name'] ?? ''));
            if ($providerName !== '') {
                $providers[] = $providerName;
            }
        }

        $id = route_key($rawId);
        $routes[] = [
            'id' => $id,
            'rawId' => $rawId,
            'source' => SOURCE_KEY,
            'sourceName' => SOURCE_NAME,
            'liveId' => $id,
            'liveIds' => [$id],
            'name' => (string) ($route['name'] ?? $rawId),
            'departure' => (string) ($route['departure'] ?? ''),
            'destination' => (string) ($route['destination'] ?? ''),
            'provider' => implode('、', array_unique($providers)),
        ];
    }

    usort($routes, static fn (array $a, array $b): int => strnatcasecmp($a['name'], $b['name']));

    return [
        'ok' => true,
        'updatedAt' => date(DATE_ATOM, filemtime($cacheDir . '/taichung_routes.json') ?: time()),
        'routes' => $routes,
    ];
}

function route_lookup(string $cacheDir): array
{
    $payload = get_routes($cacheDir);
    $lookup = [];
    foreach ($payload['routes'] as $route) {
        $lookup[(string) $route['id']] = $route;
        foreach (($route['liveIds'] ?? [$route['liveId']]) as $liveId) {
            $lookup[(string) $liveId] = $route;
        }
    }
    return $lookup;
}

function requested_route_keys(): array
{
    $raw = (string) ($_GET['routeId'] ?? '');
    if ($raw === '') {
        return [];
    }

    $ids = [];
    foreach (explode(',', $raw) as $value) {
        $id = trim($value);
        if ($id !== '') {
            $ids[$id] = true;
        }
    }

    return array_keys($ids);
}

function get_live(string $cacheDir): array
{
    $routeFilter = requested_route_keys();
    if ($routeFilter === []) {
        return [
            'ok' => true,
            'updatedAt' => null,
            'count' => 0,
            'buses' => [],
        ];
    }

    $routesById = route_lookup($cacheDir);
    $limit = max(50, min(1800, (int) ($_GET['limit'] ?? 1200)));
    $updatedAt = null;
    $buses = [];
    $seen = [];
    $routeIds = [];

    foreach ($routeFilter as $routeKey) {
        [, $rawId] = parse_route_key($routeKey);
        if ($rawId > 0) {
            $routeIds[$rawId] = true;
        }
    }

    $cacheKey = 'taichung_live_' . md5(implode(',', array_keys($routeIds)));
    $liveData = cache_json($cacheKey, 8, $cacheDir, static fn (): array => fetch_live_routes(array_keys($routeIds)));

    foreach (($liveData['routes'] ?? []) as $routePayload) {
        $routeId = (int) ($routePayload['routeId'] ?? 0);
        $routeKey = route_key($routeId);
        $route = $routesById[$routeKey] ?? null;

        foreach (($routePayload['buses'] ?? []) as $edge) {
            $bus = $edge['node'] ?? [];
            $lat = (float) ($bus['lat'] ?? 0);
            $lng = (float) ($bus['lon'] ?? 0);
            if (!in_taichung_bounds($lat, $lng)) {
                continue;
            }

            $busId = (string) ($bus['id'] ?? '');
            $dedupeKey = $routeKey . ':' . $busId;
            if ($busId === '' || isset($seen[$dedupeKey])) {
                continue;
            }
            $seen[$dedupeKey] = true;

            $dataTime = normalize_data_time($bus['dataTime'] ?? null);
            $updatedAt = max_update_time($updatedAt, $dataTime);
            $buses[] = [
                'id' => $dedupeKey,
                'busId' => $busId,
                'routeId' => $routeId,
                'routeKey' => $routeKey,
                'routeName' => $route['name'] ?? (string) $routeId,
                'sourceName' => SOURCE_NAME,
                'from' => $route['departure'] ?? '',
                'to' => $route['destination'] ?? '',
                'lat' => $lat,
                'lng' => $lng,
                'speed' => 0.0,
                'azimuth' => (int) ($bus['azimuth'] ?? 0),
                'direction' => (string) ($edge['goBack'] ?? ''),
                'dataTime' => $dataTime,
            ];

            if (count($buses) >= $limit) {
                break 2;
            }
        }
    }

    return [
        'ok' => true,
        'updatedAt' => $updatedAt,
        'count' => count($buses),
        'buses' => $buses,
    ];
}

function get_shape(int|string $routeId, string $cacheDir): array
{
    [, $rawRouteId] = parse_route_key((string) $routeId);
    if ($rawRouteId <= 0) {
        return ['ok' => true, 'routeId' => 0, 'lines' => []];
    }

    $shapeData = cache_json('taichung_shape_' . $rawRouteId, 86400, $cacheDir, static fn (): array => graphql_request(shape_query($rawRouteId)));
    $routePoint = $shapeData['data']['route']['routePoint'] ?? [];
    $lines = [];

    foreach ([1 => 'go', 2 => 'back'] as $goBack => $field) {
        $points = decode_polyline((string) ($routePoint[$field] ?? ''));
        if ($points !== []) {
            $lines[] = [
                'goBack' => (string) $goBack,
                'points' => $points,
            ];
        }
    }

    return [
        'ok' => true,
        'routeId' => route_key($rawRouteId),
        'lines' => $lines,
    ];
}

function fetch_live_routes(array $routeIds): array
{
    $routes = [];
    foreach (array_chunk(array_values($routeIds), 35) as $chunk) {
        $json = graphql_request(live_query($chunk));
        foreach (($json['data'] ?? []) as $alias => $route) {
            if (!preg_match('/^r(\d+)$/', (string) $alias, $match) || !is_array($route)) {
                continue;
            }
            $routes[] = [
                'routeId' => (int) $match[1],
                'buses' => $route['buses']['edges'] ?? [],
            ];
        }
    }

    return ['routes' => $routes];
}

function live_query(array $routeIds): string
{
    $parts = [];
    foreach ($routeIds as $routeId) {
        $routeId = (int) $routeId;
        if ($routeId <= 0) {
            continue;
        }
        $parts[] = <<<GRAPHQL
  r{$routeId}: route(xno: {$routeId}, lang: "zh") {
    buses {
      edges {
        goBack
        node {
          id
          lat
          lon
          dataTime
          azimuth
          status
          dutyStatus
          type
          provider {
            id
            name
          }
        }
      }
    }
  }
GRAPHQL;
    }

    return "{\n" . implode("\n", $parts) . "\n}";
}

function shape_query(int $routeId): string
{
    return <<<GRAPHQL
{
  route(xno: {$routeId}, lang: "zh") {
    routePoint {
      go
      back
    }
  }
}
GRAPHQL;
}

function route_key(int $routeId): string
{
    return SOURCE_KEY . ':' . $routeId;
}

function parse_route_key(string $routeId): array
{
    if (str_contains($routeId, ':')) {
        [$source, $rawId] = explode(':', $routeId, 2);
        return [$source === SOURCE_KEY ? SOURCE_KEY : SOURCE_KEY, (int) $rawId];
    }

    return [SOURCE_KEY, (int) $routeId];
}

function max_update_time(?string $current, mixed $candidate): ?string
{
    $candidate = is_string($candidate) ? $candidate : null;
    if ($candidate === null || $candidate === '') {
        return $current;
    }

    if ($current === null || strtotime($candidate) > strtotime($current)) {
        return $candidate;
    }

    return $current;
}

function normalize_data_time(mixed $value): string
{
    if (is_numeric($value)) {
        $timestamp = (int) $value;
        if ($timestamp > 0) {
            return date('Y-m-d H:i:s', $timestamp);
        }
    }

    return is_string($value) ? $value : '';
}

function decode_polyline(string $encoded): array
{
    $points = [];
    $index = 0;
    $lat = 0;
    $lng = 0;
    $length = strlen($encoded);

    while ($index < $length) {
        $lat += decode_polyline_value($encoded, $index);
        $lng += decode_polyline_value($encoded, $index);
        $pointLat = $lat / 100000;
        $pointLng = $lng / 100000;
        if (in_taichung_bounds($pointLat, $pointLng)) {
            $points[] = [$pointLat, $pointLng];
        } elseif (in_taichung_bounds($pointLng, $pointLat)) {
            [$pointLat, $pointLng] = [$pointLng, $pointLat];
            $points[] = [$pointLat, $pointLng];
        }
    }

    return $points;
}

function decode_polyline_value(string $encoded, int &$index): int
{
    $result = 0;
    $shift = 0;
    $length = strlen($encoded);

    do {
        if ($index >= $length) {
            return 0;
        }
        $byte = ord($encoded[$index++]) - 63;
        $result |= ($byte & 0x1f) << $shift;
        $shift += 5;
    } while ($byte >= 0x20);

    return ($result & 1) !== 0 ? ~($result >> 1) : ($result >> 1);
}

function in_taichung_bounds(float $lat, float $lng): bool
{
    return $lat >= TAICHUNG_BOUNDS['minLat']
        && $lat <= TAICHUNG_BOUNDS['maxLat']
        && $lng >= TAICHUNG_BOUNDS['minLng']
        && $lng <= TAICHUNG_BOUNDS['maxLng'];
}
?>
<!doctype html>
<html lang="zh-Hant">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>台中公車即時動態 Gen Art</title>
    <meta name="description" content="以台中公車即時資料生成會發光的城市移動軌跡。">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIINfQJxLLkw7VfI9u5ob7sBbhZ6Zr5sc5M=" crossorigin="">
    <style>
        :root {
            color-scheme: dark;
            --panel: rgba(11, 18, 24, .78);
            --panel-line: rgba(255, 255, 255, .14);
            --text: #eef7f4;
            --muted: #9fb0ad;
            --cyan: #54d6d2;
            --lime: #d5ef7f;
            --rose: #ff5f88;
            --amber: #ffbe55;
        }

        * { box-sizing: border-box; }

        html,
        body,
        #app,
        #map {
            width: 100%;
            height: 100%;
            margin: 0;
        }

        body {
            overflow: hidden;
            background: #091015;
            color: var(--text);
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .leaflet-pane,
        .leaflet-tile,
        .leaflet-marker-icon,
        .leaflet-marker-shadow,
        .leaflet-tile-container,
        .leaflet-pane > svg,
        .leaflet-pane > canvas,
        .leaflet-zoom-box,
        .leaflet-image-layer,
        .leaflet-layer {
            position: absolute;
            left: 0;
            top: 0;
        }

        .leaflet-container {
            overflow: hidden;
            touch-action: pan-x pan-y;
        }

        .leaflet-tile,
        .leaflet-marker-icon,
        .leaflet-marker-shadow {
            user-select: none;
            -webkit-user-drag: none;
        }

        .leaflet-tile {
            width: 256px;
            height: 256px;
        }

        .leaflet-control {
            position: relative;
            z-index: 800;
            pointer-events: auto;
        }

        .leaflet-map-pane { z-index: 400; }
        .leaflet-tile-pane { z-index: 200; }
        .leaflet-overlay-pane { z-index: 400; }
        .leaflet-shadow-pane { z-index: 500; }
        .leaflet-marker-pane { z-index: 600; }
        .leaflet-tooltip-pane { z-index: 650; }
        .leaflet-popup-pane { z-index: 700; }

        .leaflet-top,
        .leaflet-bottom {
            position: absolute;
            z-index: 1000;
            pointer-events: none;
        }

        .leaflet-top { top: 0; }
        .leaflet-right { right: 0; }
        .leaflet-bottom { bottom: 0; }
        .leaflet-left { left: 0; }

        #map,
        .leaflet-container {
            background: #091015;
        }

        .leaflet-container {
            font: inherit;
        }

        .leaflet-tile {
            filter: saturate(.72) contrast(1.08) brightness(.64);
        }

        .trail-canvas {
            position: absolute;
            inset: 0;
            z-index: 430;
            pointer-events: none;
            mix-blend-mode: screen;
        }

        .hud {
            position: fixed;
            z-index: 800;
            top: 16px;
            left: 16px;
            width: min(390px, calc(100vw - 32px));
            padding: 14px;
            border: 1px solid var(--panel-line);
            border-radius: 8px;
            background: var(--panel);
            backdrop-filter: blur(16px);
            box-shadow: 0 18px 45px rgba(0, 0, 0, .32);
        }

        .topline {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto auto;
            align-items: flex-start;
            gap: 14px;
            margin-bottom: 12px;
        }

        .hud.is-collapsed .topline {
            margin-bottom: 0;
        }

        .hud.is-collapsed .hud-body {
            display: none;
        }

        h1 {
            margin: 0;
            font-size: 18px;
            line-height: 1.2;
            letter-spacing: 0;
        }

        .status {
            color: var(--muted);
            font-size: 12px;
            line-height: 1.45;
            text-align: right;
            white-space: nowrap;
        }

        .hud-toggle {
            width: 38px;
            min-width: 38px;
            padding: 0;
            font-size: 18px;
            line-height: 1;
        }

        .controls {
            display: grid;
            grid-template-columns: 1fr auto auto;
            gap: 8px;
        }

        input,
        select,
        button {
            height: 38px;
            border: 1px solid var(--panel-line);
            border-radius: 6px;
            color: var(--text);
            background: rgba(255, 255, 255, .08);
            font: inherit;
        }

        input,
        select {
            min-width: 0;
            padding: 0 10px;
        }

        input {
            width: 100%;
        }

        input::placeholder {
            color: var(--muted);
        }

        .route-select-hidden {
            display: none;
        }

        button {
            display: inline-grid;
            place-items: center;
            min-width: 42px;
            padding: 0 11px;
            cursor: pointer;
        }

        button:hover,
        input:hover,
        input:focus,
        select:hover {
            border-color: rgba(84, 214, 210, .6);
        }

        input:focus {
            outline: none;
            box-shadow: 0 0 0 3px rgba(84, 214, 210, .14);
        }

        button.is-active {
            border-color: rgba(255, 190, 85, .75);
            color: #171006;
            background: var(--amber);
        }

        .favorite-panel {
            margin-top: 10px;
        }

        .favorite-actions {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .favorite-toggle {
            width: 100%;
        }

        .favorite-list {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 8px;
        }

        .favorite-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            max-width: 100%;
            height: 30px;
            padding: 0 6px 0 9px;
            border: 1px solid rgba(255, 255, 255, .12);
            border-radius: 6px;
            color: var(--text);
            background: rgba(255, 255, 255, .075);
            font-size: 12px;
            line-height: 1;
        }

        .favorite-chip span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .favorite-chip button {
            width: 22px;
            min-width: 22px;
            height: 22px;
            padding: 0;
            border: 0;
            background: rgba(255, 255, 255, .08);
            font-size: 14px;
            line-height: 1;
        }

        .favorite-empty {
            margin-top: 8px;
            color: var(--muted);
            font-size: 12px;
        }

        body.is-embedded .favorite-panel,
        body.is-embedded #favoriteBtn {
            display: none;
        }

        body.is-embedded .controls {
            grid-template-columns: 1fr auto;
        }

        .metrics {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-top: 12px;
        }

        .metric {
            min-width: 0;
            padding: 9px 10px;
            border: 1px solid rgba(255, 255, 255, .1);
            border-radius: 6px;
            background: rgba(255, 255, 255, .055);
        }

        .metric b {
            display: block;
            font-size: 20px;
            line-height: 1;
            color: var(--lime);
        }

        .metric span {
            display: block;
            margin-top: 5px;
            color: var(--muted);
            font-size: 11px;
        }

        .legend {
            display: flex;
            flex-wrap: wrap;
            gap: 8px 12px;
            margin-top: 12px;
            color: var(--muted);
            font-size: 12px;
        }

        .key {
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .dot {
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: var(--cyan);
            box-shadow: 0 0 12px currentColor;
        }

        .dot.slow { background: var(--rose); }
        .dot.fast { background: var(--lime); }

        .bus-icon {
            position: relative;
            width: 28px;
            height: 28px;
            border: 2px solid rgba(255, 255, 255, .82);
            border-radius: 50%;
            background: var(--bus-color);
            box-shadow: 0 0 18px var(--bus-color), 0 0 3px rgba(255,255,255,.9) inset;
            opacity: .82;
            transform: rotate(var(--heading));
        }

        .bus-icon::after {
            content: "";
            position: absolute;
            left: 50%;
            top: -7px;
            width: 0;
            height: 0;
            transform: translateX(-50%);
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-bottom: 9px solid rgba(255, 255, 255, .9);
        }

        .leaflet-popup-content-wrapper,
        .leaflet-popup-tip {
            background: rgba(10, 15, 19, .94);
            color: var(--text);
            border: 1px solid rgba(255,255,255,.12);
        }

        .popup-title {
            font-size: 15px;
            font-weight: 700;
            margin-bottom: 4px;
        }

        .popup-line {
            color: var(--muted);
            line-height: 1.55;
        }

        @media (max-width: 620px) {
            .hud {
                top: 10px;
                left: 10px;
                width: calc(100vw - 20px);
                padding: 12px;
            }

            .topline {
                align-items: flex-start;
            }

            h1 {
                font-size: 16px;
            }

            .metrics {
                grid-template-columns: repeat(3, minmax(0, 1fr));
            }

            .metric {
                padding: 8px;
            }

            .metric b {
                font-size: 18px;
            }
        }
    </style>
</head>
<body>
<div id="app">
    <div id="map"></div>
    <canvas class="trail-canvas" id="trail"></canvas>
    <section class="hud" aria-label="台中公車即時控制台">
        <div class="topline">
            <h1>台中公車即時動態</h1>
            <div class="status">
                <div id="clock">讀取中</div>
                <div id="sourceTime">Taichung City Bus</div>
            </div>
            <button id="hudToggleBtn" class="hud-toggle" type="button" title="縮合控制台" aria-label="縮合控制台" aria-expanded="true" aria-controls="hudBody">−</button>
        </div>
        <div class="hud-body" id="hudBody">
            <div class="controls">
                <input id="routeSearch" list="routeOptions" type="search" placeholder="搜尋路線，例如 300、綠1、台灣大道" aria-label="搜尋路線">
                <datalist id="routeOptions"></datalist>
                <select id="routeSelect" class="route-select-hidden" aria-label="選擇路線">
                    <option value="">全部路線</option>
                </select>
                <button id="favoriteBtn" type="button" title="加入我的最愛" aria-label="加入我的最愛">☆</button>
                <button id="refreshBtn" type="button" title="重新整理" aria-label="重新整理">↻</button>
            </div>
            <div class="favorite-panel" aria-label="我的最愛路線">
                <div class="favorite-actions">
                    <button id="favoriteModeBtn" class="favorite-toggle" type="button" aria-pressed="false">顯示我的最愛</button>
                </div>
                <div class="favorite-list" id="favoriteList"></div>
            </div>
            <div class="metrics">
                <div class="metric"><b id="busCount">0</b><span>車輛</span></div>
                <div class="metric"><b id="avgSpeed">0</b><span>平均 km/h</span></div>
                <div class="metric"><b id="routeCount">0</b><span>路線</span></div>
            </div>
            <div class="legend">
                <span class="key"><i class="dot slow"></i>慢速/停等</span>
                <span class="key"><i class="dot"></i>行駛中</span>
                <span class="key"><i class="dot fast"></i>高速</span>
            </div>
        </div>
    </section>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<script>
const map = L.map('map', {
    zoomControl: false,
    preferCanvas: true,
}).setView([24.1477, 120.6736], 13);

L.control.zoom({ position: 'bottomright' }).addTo(map);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

const canvas = document.getElementById('trail');
const ctx = canvas.getContext('2d');
const routeSearch = document.getElementById('routeSearch');
const routeOptions = document.getElementById('routeOptions');
const routeSelect = document.getElementById('routeSelect');
const favoriteBtn = document.getElementById('favoriteBtn');
const favoriteModeBtn = document.getElementById('favoriteModeBtn');
const favoriteList = document.getElementById('favoriteList');
const refreshBtn = document.getElementById('refreshBtn');
const hud = document.querySelector('.hud');
const hudToggleBtn = document.getElementById('hudToggleBtn');
const markers = new Map();
const markerAnimations = new Map();
const traces = new Map();
const REFRESH_INTERVAL_MS = 10000;
const MARKER_ANIMATION_MS = 9200;
const FAVORITES_STORAGE_KEY = 'taichungBusFavoriteRoutes';
const HUD_COLLAPSED_STORAGE_KEY = 'taichungBusHudCollapsed';
const IS_EMBEDDED = (() => {
    try {
        return window.self !== window.top;
    } catch {
        return true;
    }
})();
let routeLineLayer = L.layerGroup().addTo(map);
let refreshTimer = null;
let liveBuses = [];
let routesById = new Map();
let routeSearchIndex = [];
let routeValueBySearchText = new Map();
let routeValueByAnyRouteId = new Map();
let favoriteRouteIds = loadFavoriteRouteIds();
let favoriteMode = false;

document.body.classList.toggle('is-embedded', IS_EMBEDDED);
setHudCollapsed(loadHudCollapsed());

function fitCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function speedColor(speed) {
    if (speed < 8) return '#ff5f88';
    if (speed > 32) return '#d5ef7f';
    return '#54d6d2';
}

function routeHue(routeId) {
    const value = String(routeId);
    let hash = 0;
    for (let index = 0; index < value.length; index++) {
        hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
    }
    return Math.abs(hash * 47) % 360;
}

function iconFor(bus) {
    const color = speedColor(bus.speed);
    return L.divIcon({
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        html: `<div class="bus-icon" style="--bus-color:${color};--heading:${bus.azimuth}deg"></div>`,
    });
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = String(value ?? '');
    return div.innerHTML;
}

function popupFor(bus) {
    const direction = bus.direction === '1' ? '去程' : (bus.direction === '2' ? '返程' : '方向未定');
    const route = bus.from && bus.to ? `${escapeHtml(bus.from)} → ${escapeHtml(bus.to)}` : '';
    return `
        <div class="popup-title">${escapeHtml(bus.routeName)} · ${escapeHtml(bus.busId || bus.id)}</div>
        <div class="popup-line">${route}</div>
        <div class="popup-line">${direction} / ${Math.round(bus.speed)} km/h / ${escapeHtml(bus.dataTime)}</div>
    `;
}

function animateMarkerTo(marker, id, targetLatLng) {
    const target = L.latLng(targetLatLng);
    const current = marker.getLatLng();

    if (markerAnimations.has(id)) {
        cancelAnimationFrame(markerAnimations.get(id));
        markerAnimations.delete(id);
    }

    if (!current || current.distanceTo(target) > 2500) {
        marker.setLatLng(target);
        return;
    }

    const startLat = current.lat;
    const startLng = current.lng;
    const deltaLat = target.lat - startLat;
    const deltaLng = target.lng - startLng;
    const startTime = performance.now();

    function step(now) {
        const progress = Math.min(1, (now - startTime) / MARKER_ANIMATION_MS);
        marker.setLatLng([
            startLat + deltaLat * progress,
            startLng + deltaLng * progress,
        ]);

        if (progress < 1) {
            markerAnimations.set(id, requestAnimationFrame(step));
        } else {
            markerAnimations.delete(id);
        }
    }

    markerAnimations.set(id, requestAnimationFrame(step));
}

async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || '資料讀取失敗');
    return data;
}

async function loadRoutes() {
    const data = await fetchJson('?api=routes');
    const selectFragment = document.createDocumentFragment();
    const datalistFragment = document.createDocumentFragment();
    routeSearchIndex = [];
    routeValueBySearchText = new Map();
    routeValueByAnyRouteId = new Map();

    for (const route of data.routes) {
        routesById.set(String(route.id), route);
        const option = document.createElement('option');
        const liveIds = Array.isArray(route.liveIds) && route.liveIds.length ? route.liveIds : [route.liveId];
        const selectValue = `${route.id}|${liveIds.join(',')}`;
        const searchText = routeOptionLabel(route);
        option.value = selectValue;
        option.dataset.routeId = String(route.id);
        option.textContent = searchText;
        selectFragment.appendChild(option);

        const suggestion = document.createElement('option');
        suggestion.value = searchText;
        datalistFragment.appendChild(suggestion);

        const searchable = [
            route.name,
            route.departure,
            route.destination,
            route.provider,
            route.id,
            route.rawId,
            liveIds.join(' '),
            searchText,
        ].filter(Boolean).join(' ').toLowerCase();

        routeSearchIndex.push({ searchText, selectValue, searchable });
        routeValueBySearchText.set(searchText, selectValue);
        routeValueByAnyRouteId.set(String(route.id), { selectValue, searchText });
        routeValueByAnyRouteId.set(String(route.rawId), { selectValue, searchText });
        for (const liveId of liveIds) {
            routeValueByAnyRouteId.set(String(liveId), { selectValue, searchText });
            routeValueByAnyRouteId.set(String(liveId).split(':').pop(), { selectValue, searchText });
        }
    }

    routeSelect.appendChild(selectFragment);
    routeOptions.appendChild(datalistFragment);
    favoriteRouteIds = favoriteRouteIds.filter(routeId => routesById.has(String(routeId)));
    saveFavoriteRouteIds();
    renderFavorites();
    updateFavoriteButton();
}

function routeOptionLabel(route) {
    const endpoints = route.departure && route.destination ? `｜${route.departure} - ${route.destination}` : '';
    return `${route.name} ${endpoints}`.trim();
}

function firstRouteMatch(query) {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return null;
    return routeSearchIndex.find(route => route.searchable.includes(keyword)) || null;
}

function selectedRoute() {
    if (!routeSelect.value) return { shapeId: '', liveIds: '' };
    const [shapeId, liveIds] = routeSelect.value.split('|');
    return { shapeId, liveIds };
}

async function applyRouteSelection() {
    favoriteMode = false;
    updateFavoriteModeButton();
    updateFavoriteButton();
    await loadShape([selectedRoute().shapeId].filter(Boolean));
    await loadLive();
    startTimer();
}

async function selectRouteValue(value, searchText = '') {
    if (routeSelect.value === value && routeSearch.value === searchText) return;
    routeSelect.value = value;
    routeSearch.value = searchText;
    await applyRouteSelection();
}

async function selectRouteFromSearch({ useFirstMatch = false } = {}) {
    const query = routeSearch.value.trim();
    if (!query) {
        await selectRouteValue('', '');
        return;
    }

    const exactValue = routeValueBySearchText.get(query);
    if (exactValue) {
        await selectRouteValue(exactValue, query);
        return;
    }

    if (useFirstMatch) {
        const match = firstRouteMatch(query);
        if (match) {
            await selectRouteValue(match.selectValue, match.searchText);
        }
    }
}

function loadFavoriteRouteIds() {
    try {
        const parsed = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]');
        if (!Array.isArray(parsed)) return [];
        return [...new Set(parsed.map(id => String(id)).filter(Boolean))];
    } catch {
        return [];
    }
}

function saveFavoriteRouteIds() {
    try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteRouteIds));
    } catch {
        // Favorites are optional; keep the map usable if browser storage is unavailable.
    }
}

function loadHudCollapsed() {
    try {
        return localStorage.getItem(HUD_COLLAPSED_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

function saveHudCollapsed(isCollapsed) {
    try {
        localStorage.setItem(HUD_COLLAPSED_STORAGE_KEY, isCollapsed ? '1' : '0');
    } catch {
        // HUD state is optional.
    }
}

function setHudCollapsed(isCollapsed) {
    hud.classList.toggle('is-collapsed', isCollapsed);
    hudToggleBtn.textContent = isCollapsed ? '+' : '−';
    hudToggleBtn.title = isCollapsed ? '展開控制台' : '縮合控制台';
    hudToggleBtn.setAttribute('aria-label', hudToggleBtn.title);
    hudToggleBtn.setAttribute('aria-expanded', String(!isCollapsed));
    saveHudCollapsed(isCollapsed);
}

function currentSelectedRouteId() {
    return routeSelect.selectedOptions[0]?.dataset.routeId || '';
}

function isFavorite(routeId) {
    return favoriteRouteIds.includes(String(routeId));
}

function favoriteLiveIds() {
    return favoriteRouteIds
        .map(routeId => routesById.get(String(routeId)))
        .filter(Boolean)
        .flatMap(route => Array.isArray(route.liveIds) && route.liveIds.length ? route.liveIds : [route.liveId])
        .filter(Boolean)
        .join(',');
}

function updateFavoriteButton() {
    const routeId = currentSelectedRouteId();
    const active = routeId && isFavorite(routeId);
    favoriteBtn.textContent = active ? '★' : '☆';
    favoriteBtn.classList.toggle('is-active', Boolean(active));
    favoriteBtn.disabled = !routeId;
    favoriteBtn.title = active ? '從我的最愛移除' : '加入我的最愛';
    favoriteBtn.setAttribute('aria-label', favoriteBtn.title);
}

function renderFavorites() {
    favoriteList.replaceChildren();
    if (favoriteRouteIds.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'favorite-empty';
        empty.textContent = '尚未加入最愛路線';
        favoriteList.appendChild(empty);
        favoriteMode = false;
        updateFavoriteModeButton();
        return;
    }

    for (const routeId of favoriteRouteIds) {
        const route = routesById.get(String(routeId));
        if (!route) continue;

        const chip = document.createElement('div');
        chip.className = 'favorite-chip';

        const label = document.createElement('span');
        label.textContent = route.name;
        chip.appendChild(label);

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = '×';
        remove.title = `移除 ${route.name}`;
        remove.setAttribute('aria-label', remove.title);
        remove.addEventListener('click', async () => {
            await removeFavorite(routeId);
        });
        chip.appendChild(remove);
        favoriteList.appendChild(chip);
    }

    updateFavoriteModeButton();
}

function updateFavoriteModeButton() {
    favoriteModeBtn.classList.toggle('is-active', favoriteMode);
    favoriteModeBtn.disabled = favoriteRouteIds.length === 0;
    favoriteModeBtn.textContent = favoriteMode ? '顯示全部路線' : `顯示我的最愛 (${favoriteRouteIds.length})`;
    favoriteModeBtn.setAttribute('aria-pressed', String(favoriteMode));
}

async function setFavoriteMode(enabled) {
    if (IS_EMBEDDED) {
        favoriteMode = false;
        updateFavoriteModeButton();
        return;
    }

    favoriteMode = enabled && favoriteRouteIds.length > 0;
    updateFavoriteModeButton();
    await loadShape(favoriteMode ? favoriteRouteIds : [selectedRoute().shapeId].filter(Boolean));
    await loadLive();
    startTimer();
}

async function addFavorite(routeId) {
    const id = String(routeId);
    if (!id || isFavorite(id)) return;
    favoriteRouteIds.push(id);
    saveFavoriteRouteIds();
    renderFavorites();
    updateFavoriteButton();
}

async function removeFavorite(routeId) {
    const id = String(routeId);
    favoriteRouteIds = favoriteRouteIds.filter(favoriteId => favoriteId !== id);
    saveFavoriteRouteIds();
    renderFavorites();
    updateFavoriteButton();
    if (favoriteMode && favoriteRouteIds.length === 0) {
        await setFavoriteMode(false);
        return;
    }
    if (favoriteMode) {
        await loadShape(favoriteRouteIds);
        await loadLive();
    }
}

async function loadShape(routeIds) {
    routeLineLayer.clearLayers();
    const ids = Array.isArray(routeIds) ? routeIds.filter(Boolean) : [routeIds].filter(Boolean);
    if (ids.length === 0) return;

    for (const [routeIndex, routeId] of ids.entries()) {
        const data = await fetchJson(`?api=shape&routeId=${encodeURIComponent(routeId)}`);
        for (const [lineIndex, line] of data.lines.entries()) {
            L.polyline(line.points, {
                color: `hsl(${routeHue(`${routeId}:${routeIndex}:${lineIndex}`)} 85% 64%)`,
                weight: 4,
                opacity: .58,
                smoothFactor: 1.2,
            }).addTo(routeLineLayer);
        }
    }
}

async function loadLive() {
    const route = selectedRoute();
    const liveIds = favoriteMode && !IS_EMBEDDED ? favoriteLiveIds() : route.liveIds;
    if (!liveIds) {
        liveBuses = [];
        updateMarkers([]);
        updateMetrics({ count: 0, buses: [] });
        document.getElementById('sourceTime').textContent = '請選擇路線';
        return;
    }

    const data = await fetchJson(`?api=live${liveIds ? `&routeId=${encodeURIComponent(liveIds)}&limit=1800` : ''}`);
    liveBuses = data.buses;
    updateMarkers(data.buses);
    updateMetrics(data);
    document.getElementById('sourceTime').textContent = data.updatedAt || 'Taichung City Bus';
}

async function selectEmbeddedInitialRoute() {
    const params = new URLSearchParams(window.location.search);
    const requestedRouteId = params.get('routeId');
    const requestedRoute = params.get('route') || params.get('q');

    if (requestedRouteId) {
        const match = routeValueByAnyRouteId.get(requestedRouteId) || routeValueByAnyRouteId.get(String(Number(requestedRouteId)));
        if (match) {
            await selectRouteValue(match.selectValue, match.searchText);
            return;
        }
    }

    if (requestedRoute) {
        routeSearch.value = requestedRoute;
        const exactValue = routeValueBySearchText.get(requestedRoute);
        const match = exactValue
            ? { selectValue: exactValue, searchText: requestedRoute }
            : firstRouteMatch(requestedRoute);
        if (match) {
            await selectRouteValue(match.selectValue, match.searchText);
            return;
        }
    }

    const liveData = await fetchJson('?api=live&limit=1800');
    const counts = new Map();
    for (const bus of liveData.buses) {
        const id = String(bus.routeKey || bus.routeId);
        counts.set(id, (counts.get(id) || 0) + 1);
    }

    const activeRouteId = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([routeId]) => routeId)
        .find(routeId => routeValueByAnyRouteId.has(routeId));

    const fallback = activeRouteId
        ? routeValueByAnyRouteId.get(activeRouteId)
        : routeSearchIndex[0];

    if (fallback) {
        await selectRouteValue(fallback.selectValue, fallback.searchText);
    }
}

async function selectInitialRouteView() {
    if (favoriteRouteIds.length > 0) {
        await setFavoriteMode(true);
        return;
    }

    const randomRoute = routeSearchIndex[Math.floor(Math.random() * routeSearchIndex.length)];
    if (randomRoute) {
        await selectRouteValue(randomRoute.selectValue, randomRoute.searchText);
    }
}

function updateMarkers(buses) {
    const active = new Set();
    const bounds = [];

    for (const bus of buses) {
        active.add(bus.id);
        const latLng = [bus.lat, bus.lng];
        bounds.push(latLng);
        pushTrace(bus);

        if (markers.has(bus.id)) {
            const marker = markers.get(bus.id);
            animateMarkerTo(marker, bus.id, latLng);
            marker.setIcon(iconFor(bus));
            marker.setPopupContent(popupFor(bus));
        } else {
            const marker = L.marker(latLng, { icon: iconFor(bus), riseOnHover: true })
                .bindPopup(popupFor(bus))
                .addTo(map);
            markers.set(bus.id, marker);
        }
    }

    for (const [id, marker] of markers) {
        if (!active.has(id)) {
            if (markerAnimations.has(id)) {
                cancelAnimationFrame(markerAnimations.get(id));
                markerAnimations.delete(id);
            }
            marker.remove();
            markers.delete(id);
        }
    }

    if ((routeSelect.value || favoriteMode) && bounds.length > 0) {
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15, animate: true });
    }
}

function pushTrace(bus) {
    const point = map.latLngToContainerPoint([bus.lat, bus.lng]);
    const list = traces.get(bus.id) || [];
    list.push({
        x: point.x,
        y: point.y,
        color: `hsl(${routeHue(bus.routeKey || bus.routeId)} 85% 64%)`,
        speed: bus.speed,
        born: performance.now(),
    });
    traces.set(bus.id, list.slice(-24));
}

function updateMetrics(data) {
    const routeIds = new Set(data.buses.map(bus => bus.routeKey || bus.routeId));
    const avg = data.buses.length
        ? data.buses.reduce((sum, bus) => sum + Number(bus.speed || 0), 0) / data.buses.length
        : 0;

    document.getElementById('busCount').textContent = data.count;
    document.getElementById('avgSpeed').textContent = Math.round(avg);
    document.getElementById('routeCount').textContent = routeIds.size;
}

function drawTrails() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = performance.now();

    for (const [id, list] of traces) {
        const fresh = list.filter(point => now - point.born < 50000);
        if (fresh.length === 0) {
            traces.delete(id);
            continue;
        }
        traces.set(id, fresh);

        for (let i = 1; i < fresh.length; i++) {
            const a = fresh[i - 1];
            const b = fresh[i];
            const age = (now - b.born) / 50000;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = b.color;
            ctx.globalAlpha = Math.max(.05, .55 - age);
            ctx.lineWidth = Math.max(1, Math.min(5, b.speed / 10 + 1));
            ctx.shadowBlur = 18;
            ctx.shadowColor = b.color;
            ctx.stroke();
        }
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(drawTrails);
}

function reprojectTraces() {
    for (const bus of liveBuses) {
        const point = map.latLngToContainerPoint([bus.lat, bus.lng]);
        traces.set(bus.id, [{
            x: point.x,
            y: point.y,
            color: `hsl(${routeHue(bus.routeKey || bus.routeId)} 85% 64%)`,
            speed: bus.speed,
            born: performance.now(),
        }]);
    }
}

function startTimer() {
    clearInterval(refreshTimer);
    refreshTimer = setInterval(loadLive, REFRESH_INTERVAL_MS);
}

function tickClock() {
    document.getElementById('clock').textContent = new Intl.DateTimeFormat('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).format(new Date());
}

routeSearch.addEventListener('change', () => {
    selectRouteFromSearch();
});

routeSearch.addEventListener('input', () => {
    if (!routeSearch.value.trim()) {
        selectRouteFromSearch();
    }
});

routeSearch.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
        event.preventDefault();
        selectRouteFromSearch({ useFirstMatch: true });
    }
});

routeSelect.addEventListener('change', applyRouteSelection);

favoriteBtn.addEventListener('click', async () => {
    const routeId = currentSelectedRouteId();
    if (!routeId) return;

    if (isFavorite(routeId)) {
        await removeFavorite(routeId);
    } else {
        await addFavorite(routeId);
    }
});

favoriteModeBtn.addEventListener('click', async () => {
    await setFavoriteMode(!favoriteMode);
});

hudToggleBtn.addEventListener('click', () => {
    setHudCollapsed(!hud.classList.contains('is-collapsed'));
});

refreshBtn.addEventListener('click', loadLive);
window.addEventListener('resize', fitCanvas);
map.on('move zoom resize', reprojectTraces);

fitCanvas();
drawTrails();
setInterval(tickClock, 1000);
tickClock();

(async function init() {
    try {
        await loadRoutes();
        if (IS_EMBEDDED) {
            await selectEmbeddedInitialRoute();
            return;
        }
        await selectInitialRouteView();
    } catch (error) {
        document.getElementById('sourceTime').textContent = error.message;
    }
})();
</script>
</body>
</html>
