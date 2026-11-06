<?php
declare(strict_types=1);

/**
 * Shared bootstrap for the staging trip planner.
 * This directory is not a public URL. Front controllers require it.
 */

if (PHP_SAPI !== 'cli' && PHP_SAPI !== 'phpdbg') {
    $atpSelf = realpath(__FILE__);
    $atpScript = realpath((string)($_SERVER['SCRIPT_FILENAME'] ?? ''));
    if ($atpSelf !== false && $atpSelf === $atpScript) {
        http_response_code(404);
        header('Content-Type: text/plain; charset=UTF-8');
        header('X-Robots-Tag: noindex, nofollow, noarchive');
        echo "Not found.\n";
        exit;
    }
    unset($atpSelf, $atpScript);
}

const ATP_RECEIVED_MESSAGE = 'Your trip request was received. Availability and prices are still to be confirmed.';
const ATP_DUMMY_PASSWORD_HASH = '$2y$10$tRfQ0EHUXiZ1MLG2ozlmUORR2QRH1yLLFygMI74DkDX//x1Tk6Tve';

function atp_h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function atp_common_headers(): void
{
    header('X-Robots-Tag: noindex, nofollow, noarchive');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: no-referrer');
    header('Cache-Control: private, no-store, max-age=0, must-revalidate');
    header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
}

function atp_config_path(): string
{
    $env = getenv('AFGHANTOURS_TRIP_PLANNER_CONFIG');
    if (is_string($env) && $env !== '') {
        return $env;
    }
    return '/home/jamesbon/private/afghantours-trip-planner/config.php';
}

function atp_path_allowed(string $path): bool
{
    $norm = rtrim(str_replace('\\', '/', $path), '/');
    if (preg_match('#/(?:public_html|staging\\.afghantours\\.com|www)(?:/|$)#i', $norm)) {
        return false;
    }
    $doc = (string)($_SERVER['DOCUMENT_ROOT'] ?? '');
    if ($doc !== '') {
        $docReal = realpath($doc);
        $docNorm = rtrim(str_replace('\\', '/', $docReal !== false ? $docReal : $doc), '/');
        if ($norm === $docNorm || str_starts_with($norm, $docNorm . '/')) {
            return false;
        }
    }
    return $norm !== '';
}

function atp_boot(): array
{
    ini_set('display_errors', '0');
    $path = atp_config_path();
    if (!is_file($path)) {
        return ['ok' => false, 'error' => 'missing'];
    }
    $real = realpath($path);
    if ($real === false || !atp_path_allowed($real)) {
        return ['ok' => false, 'error' => 'location'];
    }
    $config = require $real;
    if (!is_array($config)) {
        return ['ok' => false, 'error' => 'invalid'];
    }
    $root = $config['data_root'] ?? '';
    if (!is_string($root) || $root === '' || !atp_path_allowed($root)) {
        return ['ok' => false, 'error' => 'location'];
    }
    if (!is_dir($root) && !@mkdir($root, 0700, true)) {
        return ['ok' => false, 'error' => 'storage'];
    }
    $rootReal = realpath($root);
    if ($rootReal === false || !atp_path_allowed($rootReal)) {
        return ['ok' => false, 'error' => 'location'];
    }
    foreach (['intake', 'sessions', 'ratelimit'] as $dir) {
        $full = $rootReal . DIRECTORY_SEPARATOR . $dir;
        if (!is_dir($full) && !@mkdir($full, 0700, true)) {
            return ['ok' => false, 'error' => 'storage'];
        }
    }
    $key = $config['ip_hash_key'] ?? '';
    if (!is_string($key) || strlen($key) < 16 || str_contains($key, 'REPLACE_WITH')) {
        return ['ok' => false, 'error' => 'invalid'];
    }
    $config['data_root'] = $rootReal;
    $config['_config_path'] = $real;
    return ['ok' => true, 'config' => $config];
}

function atp_staff_ready(array $config): bool
{
    $user = $config['staff_username'] ?? '';
    $hash = $config['staff_password_hash'] ?? '';
    if (!is_string($user) || !is_string($hash)) {
        return false;
    }
    if ($user === '' || strlen($user) > 64 || preg_match('/\s/', $user)) {
        return false;
    }
    if (str_contains($hash, 'REPLACE_WITH') || !preg_match('/^\$(?:2y|2a|2b|argon2)/', $hash)) {
        return false;
    }
    return true;
}

function atp_ip_hash(array $config): string
{
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    return hash('sha256', $config['ip_hash_key'] . '|' . $ip);
}

function atp_app_path(): string
{
    $script = str_replace('\\', '/', (string)($_SERVER['SCRIPT_NAME'] ?? '/private-calculator/index.php'));
    $dir = rtrim(str_replace('\\', '/', dirname($script)), '/');
    if ($dir === '' || $dir === '.') {
        $dir = '/private-calculator';
    }
    return $dir . '/';
}

function atp_throttle(array $config, string $bucket, string $key, int $limit, int $window, bool $record): bool
{
    $safeBucket = preg_replace('/[^a-z0-9_-]/', '', $bucket) ?? '';
    if ($safeBucket === '') {
        return true;
    }
    $path = $config['data_root'] . '/ratelimit/' . $safeBucket . '.json';
    $fh = fopen($path, 'c+');
    if ($fh === false) {
        return true;
    }
    try {
        if (!flock($fh, LOCK_EX)) {
            return true;
        }
        rewind($fh);
        $raw = stream_get_contents($fh);
        $data = json_decode($raw === false || $raw === '' ? '{}' : $raw, true);
        $events = is_array($data['events'] ?? null) ? $data['events'] : [];
        $now = time();
        $kept = [];
        $count = 0;
        foreach ($events as $event) {
            if (!is_array($event)) {
                continue;
            }
            $age = $now - (int)($event['t'] ?? 0);
            if ($age < 0 || $age >= $window) {
                continue;
            }
            $kept[] = $event;
            if (($event['k'] ?? '') === $key) {
                $count++;
            }
        }
        $blocked = $count >= $limit;
        if ($record && !$blocked) {
            $kept[] = ['t' => $now, 'k' => $key];
        }
        $encoded = json_encode(['events' => $kept]);
        if ($encoded === false) {
            return true;
        }
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, $encoded);
        fflush($fh);
        return $blocked;
    } finally {
        flock($fh, LOCK_UN);
        fclose($fh);
    }
}

function atp_client_agent(): string
{
    $ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
    $ua = preg_replace('/[\x00-\x1F\x7F]/', '', $ua) ?? '';
    if (strlen($ua) > 160) {
        $ua = substr($ua, 0, 160);
    }
    return $ua;
}
