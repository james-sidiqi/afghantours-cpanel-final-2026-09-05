<?php
declare(strict_types=1);

/**
 * AfghanTours — HesabPay payment framework (shared library).
 *
 * This file only defines functions. It is included by:
 *   /payments/create-session.php
 *   /payments/webhook.php
 *   /payments/status.php
 *
 * SECRETS: nothing secret lives in this file or anywhere in git. The API key is
 * read from the environment (HESABPAY_API_KEY) or from a PHP config file that
 * sits OUTSIDE the web root (default: <docroot>/../afghantours-private/hesabpay-config.php,
 * i.e. /home/jamesbon/afghantours-private/hesabpay-config.php on the live host).
 * See config/hesabpay-config.example.php and docs/PAYMENTS-HESABPAY.md.
 *
 * HesabPay API facts used here were taken from:
 *   - Official docs: https://docs.hesab.com (authentication, create-payment-session,
 *     webhooks/overview, webhooks/event-payloads, webhooks/verify-signatures,
 *     payment-methods/international-cards) — read 2026-10-10.
 *   - WordPress plugin "Integrate HesabPay for WooCommerce" v1.0.0 source
 *     (integrate-hesabpay-for-woocommerce.php) — same endpoints, header, and
 *     webhook fields.
 * Anything not confirmed by those sources is marked "VERIFY with HesabPay docs".
 */

// Refuse to run when requested directly over HTTP (lib/.htaccess also denies it).
if (PHP_SAPI !== 'cli' && isset($_SERVER['SCRIPT_FILENAME'])
    && realpath((string)$_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(404);
    exit;
}

const HESABPAY_MODES = ['disabled', 'link', 'api'];

// Minimal fallbacks for hosts without mbstring (byte-based; inputs are clamped anyway).
if (!function_exists('mb_strlen')) {
    function mb_strlen(string $s): int { return strlen($s); }
}
if (!function_exists('mb_substr')) {
    function mb_substr(string $s, int $start, ?int $len = null): string { return (string)substr($s, $start, $len); }
}

/* ------------------------------------------------------------------------- */
/* HesabPay API adapter — the ONLY place endpoint paths and field names live. */
/* ------------------------------------------------------------------------- */

/** Production API base (docs.hesab.com "Base URLs"). Sandbox: https://api-sandbox.hesab.com */
const HESABPAY_DEFAULT_API_BASE = 'https://api.hesab.com';
/** POST — docs.hesab.com/api-reference/create-payment-session/ ; plugin process_payment(). */
const HESABPAY_PATH_CREATE_SESSION = '/api/v1/payment/create-session';
/** POST — docs.hesab.com/webhooks/verify-signatures/ ; plugin verify_signature(). */
const HESABPAY_PATH_VERIFY_SIGNATURE = '/api/v1/hesab/webhooks/verify-signature';
/** Webhook/session "success" status code (docs event-payloads + create-session response; plugin checks === 10). */
const HESABPAY_STATUS_SUCCESS = 10;
/** Field limits from docs.hesab.com/quickstart/create-session/ "Request field limits". */
const HESABPAY_MAX_ITEM_ID = 50;
const HESABPAY_MAX_ITEM_NAME = 500;
const HESABPAY_MAX_USER_ID = 50;

/** Authorization header value: "Authorization: API-KEY <key>" (docs api-reference/authentication; plugin). */
function hesabpay_auth_header(string $apiKey): string {
    return 'Authorization: API-KEY ' . $apiKey;
}

/**
 * Build the create-session JSON body.
 * Docs fields: items[] (required; {id, name, price}; NO quantity field), user_id (optional, <=50),
 * email (optional), redirect_success_url (optional), redirect_failure_url (optional).
 * Prices are "treated as AFN" (docs payment-methods/international-cards). There is no
 * currency field in the documented request. VERIFY with HesabPay docs before charging
 * anything other than AFN.
 */
function hesabpay_build_session_payload(array $p): array {
    $payload = [
        'user_id' => mb_substr($p['user_id'], 0, HESABPAY_MAX_USER_ID),
        'items' => [[
            'id' => mb_substr($p['item_id'], 0, HESABPAY_MAX_ITEM_ID),
            'name' => mb_substr($p['item_name'], 0, HESABPAY_MAX_ITEM_NAME),
            // "numeric amount with no more than two decimal places"
            'price' => round((float)$p['amount'], 2),
        ]],
        'redirect_success_url' => $p['success_url'],
        'redirect_failure_url' => $p['failure_url'],
    ];
    if (($p['email'] ?? '') !== '') {
        $payload['email'] = $p['email'];
    }
    return $payload;
}

/**
 * Extract the hosted checkout URL from a create-session response.
 * Docs 200 response: {"status_code":10,"success":true,"message":"...","url":"https://...","expires_at":"..."}
 * Plugin only reads $body['url'].
 */
function hesabpay_session_url_from_response(array $body): ?string {
    $url = $body['url'] ?? null;
    if (!is_string($url) || $url === '') {
        return null;
    }
    if (isset($body['success']) && $body['success'] !== true) {
        return null;
    }
    $scheme = strtolower((string)parse_url($url, PHP_URL_SCHEME));
    if ($scheme !== 'https' && !hesabpay_is_test_url($url)) {
        return null;
    }
    return $url;
}

/** Verify-signature request body: {"signature": "...", "timestamp": "..."} (docs + plugin). */
function hesabpay_build_verify_payload(string $signature, string $timestamp): array {
    return ['signature' => $signature, 'timestamp' => $timestamp];
}

/** Verify-signature response is trusted only when body.success === true (docs Node example; plugin). */
function hesabpay_verify_ok(array $body): bool {
    return isset($body['success']) && $body['success'] === true;
}

/**
 * Webhook payload → normalized record.
 * Documented payment_success payload fields (docs webhooks/event-payloads):
 *   status_code, success, message, sender_account, transaction_id, user_id, amount, memo,
 *   signature, timestamp, transaction_date, items[{id,name,price}], email
 * The payment_failure payload shape is NOT documented. VERIFY with HesabPay docs.
 */
function hesabpay_normalize_webhook(array $d): array {
    $paid = isset($d['status_code']) && (int)$d['status_code'] === HESABPAY_STATUS_SUCCESS
        && isset($d['success']) && $d['success'] === true;
    $items = is_array($d['items'] ?? null) ? $d['items'] : [];
    return [
        'paid' => $paid,
        'status_code' => isset($d['status_code']) ? (int)$d['status_code'] : null,
        'message' => clamp_str((string)($d['message'] ?? ''), 300),
        'transaction_id' => clamp_str((string)($d['transaction_id'] ?? ''), 100),
        'user_id' => clamp_str((string)($d['user_id'] ?? ''), HESABPAY_MAX_USER_ID),
        'amount' => isset($d['amount']) && is_numeric($d['amount']) ? (float)$d['amount'] : null,
        'transaction_date' => clamp_str((string)($d['transaction_date'] ?? ''), 40),
        'email' => clamp_str((string)($d['email'] ?? ''), 190),
        'item_ids' => array_values(array_map(static fn($i) => clamp_str((string)($i['id'] ?? ''), 60), array_filter($items, 'is_array'))),
        'timestamp' => clamp_str((string)($d['timestamp'] ?? ''), 40),
    ];
}

/* ------------------------------------------------------------------------- */
/* Configuration                                                              */
/* ------------------------------------------------------------------------- */

function hesabpay_private_dir_default(): string {
    // Live cPanel layout (addon domain, docroot is NOT public_html):
    //   /home/jamesbon/afghantours.com/payments/lib/hesabpay.php  →  /home/jamesbon/afghantours-private/
    // i.e. <docroot>/../afghantours-private. Override with env HESABPAY_CONFIG / HESABPAY_DATA_DIR.
    return dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . 'afghantours-private';
}

function hesabpay_defaults(): array {
    $private = hesabpay_private_dir_default();
    return [
        'mode' => 'disabled',                       // disabled | link | api
        'api_key' => '',
        'api_base' => HESABPAY_DEFAULT_API_BASE,
        'public_link_url' => 'https://hesab.com/pay/AFGHANTOURS/en',
        'site_url' => 'https://afghantours.com',
        'success_url' => 'https://afghantours.com/pay/success/',
        'cancel_url' => 'https://afghantours.com/pay/cancelled/',
        'currency' => 'AFN',                        // docs: item prices are treated as AFN
        'min_amount' => 40.0,                       // docs: international cards need ~40 AFN or more
        'max_amount' => null,                       // set by James (typo guard)
        'allowed_origins' => [],                    // extra origins allowed to POST (besides this host)
        'data_dir' => $private . DIRECTORY_SEPARATOR . 'payments-data',
        'notify_email' => 'info@afghantours.com',
        'notify_from' => 'AfghanTours Website <info@afghantours.com>',
        'notify_on_webhook' => true,
        'notify_on_intent' => false,
        'rate_limit_per_hour' => 10,
        'http_connect_timeout' => 5,
        'http_timeout' => 15,
        'check_token' => '',                        // enables /payments/check.php?token=... (>=24 chars)
    ];
}

function hesabpay_config_path(): ?string {
    $env = getenv('HESABPAY_CONFIG');
    if (is_string($env) && $env !== '') {
        return $env;
    }
    $candidates = [hesabpay_private_dir_default() . DIRECTORY_SEPARATOR . 'hesabpay-config.php'];
    $docRoot = (string)($_SERVER['DOCUMENT_ROOT'] ?? '');
    if ($docRoot !== '') {
        $candidates[] = dirname(rtrim($docRoot, '/\\')) . DIRECTORY_SEPARATOR . 'afghantours-private' . DIRECTORY_SEPARATOR . 'hesabpay-config.php';
    }
    foreach ($candidates as $c) {
        if (is_file($c) && is_readable($c)) {
            return $c;
        }
    }
    return null;
}

/**
 * Load config: defaults ← private config file ← environment variables.
 * Any problem (missing file, bad mode, missing key in api mode) degrades to "disabled".
 */
function hesabpay_config(): array {
    static $cfg = null;
    if ($cfg !== null) {
        return $cfg;
    }
    $cfg = hesabpay_defaults();
    $problems = [];

    $path = hesabpay_config_path();
    if ($path !== null && is_file($path)) {
        $file = (static function (string $f) { return include $f; })($path);
        if (is_array($file)) {
            $cfg = array_merge($cfg, $file);
        } else {
            $problems[] = 'config_file_not_array';
        }
    }

    $envMap = [
        'HESABPAY_MODE' => 'mode',
        'HESABPAY_API_KEY' => 'api_key',
        'HESABPAY_API_BASE' => 'api_base',
        'HESABPAY_PUBLIC_LINK_URL' => 'public_link_url',
        'HESABPAY_SUCCESS_URL' => 'success_url',
        'HESABPAY_CANCEL_URL' => 'cancel_url',
        'HESABPAY_CURRENCY' => 'currency',
        'HESABPAY_MIN_AMOUNT' => 'min_amount',
        'HESABPAY_MAX_AMOUNT' => 'max_amount',
        'HESABPAY_DATA_DIR' => 'data_dir',
        'HESABPAY_NOTIFY_EMAIL' => 'notify_email',
        'HESABPAY_RATE_LIMIT_PER_HOUR' => 'rate_limit_per_hour',
    ];
    foreach ($envMap as $env => $key) {
        $v = getenv($env);
        if (is_string($v) && $v !== '') {
            $cfg[$key] = $v;
        }
    }

    $cfg['mode'] = strtolower(trim((string)$cfg['mode']));
    if (!in_array($cfg['mode'], HESABPAY_MODES, true)) {
        $problems[] = 'invalid_mode';
        $cfg['mode'] = 'disabled';
    }
    $cfg['api_base'] = rtrim((string)$cfg['api_base'], '/');
    if ($cfg['mode'] === 'api') {
        if (trim((string)$cfg['api_key']) === '') {
            $problems[] = 'api_mode_without_key';
            $cfg['mode'] = 'disabled';
        } elseif (!hesabpay_url_allowed($cfg['api_base'])) {
            $problems[] = 'api_base_not_https';
            $cfg['mode'] = 'disabled';
        }
    }
    if ($cfg['mode'] === 'link' && !hesabpay_url_allowed((string)$cfg['public_link_url'])) {
        $problems[] = 'link_url_not_https';
        $cfg['mode'] = 'disabled';
    }
    $cfg['currency'] = strtoupper(trim((string)$cfg['currency'])) ?: 'AFN';
    $cfg['min_amount'] = ($cfg['min_amount'] === null || $cfg['min_amount'] === '') ? null : (float)$cfg['min_amount'];
    $cfg['max_amount'] = ($cfg['max_amount'] === null || $cfg['max_amount'] === '') ? null : (float)$cfg['max_amount'];
    $cfg['rate_limit_per_hour'] = max(0, (int)$cfg['rate_limit_per_hour']);
    $cfg['_problems'] = $problems;
    $cfg['_config_file_found'] = $path !== null;
    return $cfg;
}

/** https only, except loopback hosts used by the local test harness. */
function hesabpay_url_allowed(string $url): bool {
    $scheme = strtolower((string)parse_url($url, PHP_URL_SCHEME));
    return $scheme === 'https' || ($scheme === 'http' && hesabpay_is_test_url($url));
}

function hesabpay_is_test_url(string $url): bool {
    $host = strtolower((string)parse_url($url, PHP_URL_HOST));
    return in_array($host, ['127.0.0.1', 'localhost', '::1', '[::1]'], true);
}

/* ------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* ------------------------------------------------------------------------- */

function clamp_str(string $value, int $max): string {
    $value = str_replace(["\0", "\r", "\n"], ['', ' ', ' '], $value);
    $value = preg_replace('/[\x00-\x1F\x7F]/u', '', $value) ?? '';
    $value = trim($value);
    return mb_strlen($value) > $max ? mb_substr($value, 0, $max) : $value;
}

function post_field(string $name): string {
    return trim((string)($_POST[$name] ?? ''));
}

function client_ip(): string {
    return (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
}

function wants_json_response(): bool {
    return str_contains((string)($_SERVER['HTTP_ACCEPT'] ?? ''), 'application/json')
        || post_field('format') === 'json';
}

function respond_json_and_exit(int $code, array $payload): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex, nofollow');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function redirect_and_exit(string $url): void {
    header('Cache-Control: no-store');
    header('Location: ' . $url, true, 303);
    exit;
}

/** Ensure the private data dir exists and is writable; returns path or null. */
function hesabpay_data_dir(array $cfg): ?string {
    $dir = (string)$cfg['data_dir'];
    if ($dir === '') {
        return null;
    }
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    if (!is_dir($dir) || !is_writable($dir)) {
        return null;
    }
    // Belt and braces in case someone points data_dir inside the web root.
    $ht = $dir . DIRECTORY_SEPARATOR . '.htaccess';
    if (!is_file($ht)) {
        @file_put_contents($ht, "Require all denied\nDeny from all\n");
    }
    return $dir;
}

/** Append one minimal JSON line to payments.log (never card data, never the API key). */
function hesabpay_log(array $cfg, string $event, array $data = []): void {
    $dir = hesabpay_data_dir($cfg);
    if ($dir === null) {
        return;
    }
    $line = json_encode(['ts' => gmdate('c'), 'event' => $event] + $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    @file_put_contents($dir . DIRECTORY_SEPARATOR . 'payments.log', $line . "\n", FILE_APPEND | LOCK_EX);
}

/** Simple per-IP fixed-window limiter stored in data_dir. Returns true when allowed. */
function hesabpay_rate_limit_ok(array $cfg, string $bucket): bool {
    $limit = (int)$cfg['rate_limit_per_hour'];
    $dir = hesabpay_data_dir($cfg);
    if ($limit <= 0 || $dir === null) {
        return true;
    }
    $rlDir = $dir . DIRECTORY_SEPARATOR . 'ratelimit';
    if (!is_dir($rlDir)) {
        @mkdir($rlDir, 0700, true);
    }
    $file = $rlDir . DIRECTORY_SEPARATOR . $bucket . '-' . hash('sha256', client_ip()) . '.json';
    $fh = @fopen($file, 'c+');
    if ($fh === false) {
        return true;
    }
    flock($fh, LOCK_EX);
    $raw = stream_get_contents($fh);
    $state = json_decode((string)$raw, true);
    $now = time();
    if (!is_array($state) || ($now - (int)($state['start'] ?? 0)) >= 3600) {
        $state = ['start' => $now, 'count' => 0];
    }
    $state['count']++;
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, (string)json_encode($state));
    flock($fh, LOCK_UN);
    fclose($fh);
    return $state['count'] <= $limit;
}

/**
 * Same-origin / CSRF check for a static site with no server session:
 * require an Origin (or Referer) whose host matches this host or a configured origin.
 * Also honour Sec-Fetch-Site when the browser sends it.
 */
function hesabpay_same_origin_ok(array $cfg): bool {
    $host = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
    $allowedHosts = [$host];
    foreach ((array)$cfg['allowed_origins'] as $o) {
        $h = strtolower((string)parse_url((string)$o, PHP_URL_HOST));
        $p = parse_url((string)$o, PHP_URL_PORT);
        if ($h !== '') {
            $allowedHosts[] = $p ? "$h:$p" : $h;
        }
    }
    $sfs = strtolower((string)($_SERVER['HTTP_SEC_FETCH_SITE'] ?? ''));
    if ($sfs !== '' && !in_array($sfs, ['same-origin', 'none'], true)) {
        return false;
    }
    $origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origin === '' || $origin === 'null') {
        $origin = (string)($_SERVER['HTTP_REFERER'] ?? '');
    }
    if ($origin === '') {
        return false;
    }
    $oh = strtolower((string)parse_url($origin, PHP_URL_HOST));
    $op = parse_url($origin, PHP_URL_PORT);
    $originHost = $op ? "$oh:$op" : $oh;
    return $host !== '' && in_array($originHost, $allowedHosts, true);
}

/**
 * POST JSON to HesabPay with timeouts. Returns ['ok'=>bool,'status'=>int,'body'=>array|null,'error'=>string].
 * Never throws; never returns the API key.
 */
function hesabpay_post_json(array $cfg, string $path, array $payload): array {
    $url = $cfg['api_base'] . $path;
    $json = (string)json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $headers = [
        hesabpay_auth_header((string)$cfg['api_key']),
        'Content-Type: application/json',
        'Accept: application/json',
    ];
    $status = 0;
    $raw = '';
    $err = '';
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => (int)$cfg['http_connect_timeout'],
            CURLOPT_TIMEOUT => (int)$cfg['http_timeout'],
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        $res = curl_exec($ch);
        if ($res === false) {
            $err = 'curl_error_' . curl_errno($ch);
        } else {
            $raw = (string)$res;
            $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        }
        curl_close($ch);
    } else {
        $ctx = stream_context_create(['http' => [
            'method' => 'POST',
            'header' => implode("\r\n", $headers),
            'content' => $json,
            'timeout' => (int)$cfg['http_timeout'],
            'ignore_errors' => true,
            'follow_location' => 0,
        ]]);
        $res = @file_get_contents($url, false, $ctx);
        if ($res === false) {
            $err = 'stream_error';
        } else {
            $raw = $res;
            foreach ($http_response_header ?? [] as $h) {
                if (preg_match('#^HTTP/\S+\s+(\d{3})#', $h, $m)) {
                    $status = (int)$m[1];
                }
            }
        }
    }
    $body = json_decode($raw, true);
    return [
        'ok' => $err === '' && $status >= 200 && $status < 300 && is_array($body),
        'status' => $status,
        'body' => is_array($body) ? $body : null,
        'error' => $err,
    ];
}

/* ------------------------------------------------------------------------- */
/* Payment records (private, outside web root)                                */
/* ------------------------------------------------------------------------- */

function hesabpay_safe_key(string $s): string {
    return preg_replace('/[^A-Za-z0-9_-]/', '_', $s) ?? 'x';
}

function hesabpay_save_intent(array $cfg, array $intent): void {
    $dir = hesabpay_data_dir($cfg);
    if ($dir === null) {
        return;
    }
    $iDir = $dir . DIRECTORY_SEPARATOR . 'intents';
    if (!is_dir($iDir)) {
        @mkdir($iDir, 0700, true);
    }
    @file_put_contents($iDir . DIRECTORY_SEPARATOR . hesabpay_safe_key($intent['user_id']) . '.json',
        json_encode($intent, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
}

function hesabpay_load_intent(array $cfg, string $userId): ?array {
    $dir = hesabpay_data_dir($cfg);
    if ($dir === null || $userId === '') {
        return null;
    }
    $f = $dir . DIRECTORY_SEPARATOR . 'intents' . DIRECTORY_SEPARATOR . hesabpay_safe_key($userId) . '.json';
    if (!is_file($f)) {
        return null;
    }
    $d = json_decode((string)file_get_contents($f), true);
    return is_array($d) ? $d : null;
}

/**
 * Record a verified webhook exactly once. Returns 'new', 'duplicate', or 'unwritable'.
 * Uses fopen('x') so two concurrent deliveries cannot both win.
 */
function hesabpay_record_webhook_once(array $cfg, string $idemKey, array $record): string {
    $dir = hesabpay_data_dir($cfg);
    if ($dir === null) {
        return 'unwritable';
    }
    $wDir = $dir . DIRECTORY_SEPARATOR . 'webhooks';
    if (!is_dir($wDir)) {
        @mkdir($wDir, 0700, true);
    }
    $f = $wDir . DIRECTORY_SEPARATOR . hash('sha256', $idemKey) . '.json';
    $fh = @fopen($f, 'x');
    if ($fh === false) {
        return is_file($f) ? 'duplicate' : 'unwritable';
    }
    fwrite($fh, (string)json_encode($record, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    fclose($fh);
    return 'new';
}

function hesabpay_mail(array $cfg, string $subject, string $body, string $replyTo = ''): bool {
    $to = (string)$cfg['notify_email'];
    if ($to === '' || getenv('HESABPAY_TEST_NO_MAIL') === '1') {
        return false;
    }
    $headers = ['From: ' . clamp_str((string)$cfg['notify_from'], 200), 'Content-Type: text/plain; charset=UTF-8'];
    if ($replyTo !== '' && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
        $headers[] = 'Reply-To: ' . $replyTo;
    }
    return @mail($to, clamp_str($subject, 200), $body, implode("\r\n", $headers));
}

/** Minimal branded HTML response page for non-JS form posts. */
function hesabpay_html_page(int $code, string $title, string $message, bool $showContact = true): void {
    http_response_code($code);
    header('Content-Type: text/html; charset=UTF-8');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex, nofollow');
    $t = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
    $m = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
    $contact = $showContact
        ? '<p class="alt">Email <a href="mailto:info@afghantours.com">info@afghantours.com</a> or message us on <a href="https://wa.me/93780123456" style="white-space:nowrap">WhatsApp +93 780 123 456</a>.</p>'
        : '';
    echo <<<HTML
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>{$t} | Afghan Tours</title>
  <style>
    body{margin:0;background:#fbf6ed;color:#101820;font:16px/1.6 system-ui,-apple-system,Segoe UI,sans-serif;display:grid;place-items:center;min-height:100vh;padding:1.25rem;box-sizing:border-box}
    main{max-width:620px;width:100%;background:#fff;border:1px solid rgba(16,24,32,.1);border-radius:1.5rem;box-shadow:0 18px 50px rgba(21,16,9,.1);padding:clamp(1.5rem,4vw,2.4rem);box-sizing:border-box}
    .eyebrow{margin:0;color:#b97816;text-transform:uppercase;letter-spacing:.24em;font-size:.75rem;font-weight:900}
    h1{font-family:Georgia,"Times New Roman",serif;font-size:clamp(2rem,6vw,2.8rem);line-height:1;letter-spacing:-.04em;margin:.6rem 0 1rem}
    p{color:#4b5563}
    .alt a{color:#101820;font-weight:800}
    .actions{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:1.4rem}
    .actions a{display:inline-flex;border-radius:999px;background:#101820;color:#fff;text-decoration:none;padding:.85rem 1.15rem;font-weight:900}
    .actions a.secondary{background:#f1dfb8;color:#101820}
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">Afghan Tours · Payments</p>
    <h1>{$t}</h1>
    <p>{$m}</p>
    {$contact}
    <div class="actions"><a href="/contact/">Contact us</a><a class="secondary" href="/pay/">Back to payment page</a></div>
  </main>
</body>
</html>
HTML;
    exit;
}
