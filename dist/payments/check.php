<?php
declare(strict_types=1);

/**
 * AfghanTours — payments server check (diagnostics).
 *
 * OFF by default: returns 404 unless the private config sets 'check_token' (24+ chars)
 * and the request supplies ?token=<same value>. Run it once after setup, then set
 * 'check_token' back to ''. Never prints the API key or any secret — only yes/no.
 */

require __DIR__ . '/lib/hesabpay.php';

$cfg = hesabpay_config();
$expected = (string)($cfg['check_token'] ?? '');
$given = (string)($_GET['token'] ?? '');
if (strlen($expected) < 24 || $given === '' || !hash_equals($expected, $given)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'Not found';
    exit;
}

$checks = [];
$add = static function (string $name, bool $ok, string $detail = '') use (&$checks): void {
    $checks[] = ['check' => $name, 'ok' => $ok, 'detail' => $detail];
};

$add('php_version >= 8.1', version_compare(PHP_VERSION, '8.1.0', '>='), PHP_VERSION);
foreach (['curl', 'openssl', 'json', 'mbstring'] as $ext) {
    $add("extension: $ext", extension_loaded($ext));
}
$add('mail() available', function_exists('mail') && !in_array('mail', array_map('trim', explode(',', (string)ini_get('disable_functions'))), true));
$https = (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off')
    || strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https'
    || (string)($_SERVER['SERVER_PORT'] ?? '') === '443';
$add('request served over HTTPS', $https);
$add('private config file found', (bool)$cfg['_config_file_found']);
$add('config problems', $cfg['_problems'] === [], implode(',', $cfg['_problems']));
$add('effective mode', true, (string)$cfg['mode']);
$add('api_key present', trim((string)$cfg['api_key']) !== '', 'value not shown');
$add('api_base https', hesabpay_url_allowed((string)$cfg['api_base']), (string)$cfg['api_base']);
$dir = hesabpay_data_dir($cfg);
$add('private data dir writable', $dir !== null, $dir !== null ? 'ok' : 'cannot create/write data_dir');
$docRoot = realpath((string)($_SERVER['DOCUMENT_ROOT'] ?? '')) ?: '';
$add('private data dir is outside docroot', $dir !== null && $docRoot !== '' && !str_starts_with((string)realpath($dir), $docRoot));

// Outbound HTTPS reachability only (no API key sent, no payment created). Any HTTP status = reachable.
$reach = false;
$detail = '';
if (function_exists('curl_init')) {
    $ch = curl_init(rtrim((string)$cfg['api_base'], '/') . '/');
    curl_setopt_array($ch, [CURLOPT_NOBODY => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 10, CURLOPT_SSL_VERIFYPEER => true]);
    $r = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $reach = $r !== false && $code > 0;
    $detail = $reach ? "HTTP $code" : 'curl error ' . curl_errno($ch);
    curl_close($ch);
} else {
    $detail = 'curl missing';
}
$add('outbound HTTPS to ' . (string)parse_url((string)$cfg['api_base'], PHP_URL_HOST), $reach, $detail);

hesabpay_log($cfg, 'server_check_run', ['all_ok' => !in_array(false, array_column($checks, 'ok'), true)]);
respond_json_and_exit(200, ['ok' => true, 'checks' => $checks, 'reminder' => "Set 'check_token' back to '' when done."]);
