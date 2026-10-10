<?php
declare(strict_types=1);
/**
 * Local FAKE HesabPay API for scripts/test-payments.sh — never deployed, never contacts Hesab.
 * Run: php -S 127.0.0.1:18081 scripts/payments-test/hesab-stub.php
 * Mirrors the documented contract (docs.hesab.com):
 *   POST /api/v1/payment/create-session        Authorization: API-KEY <key>
 *   POST /api/v1/hesab/webhooks/verify-signature  {signature,timestamp} → {success:true|false}
 * Records each request body to $STUB_LOG_DIR/<endpoint>.json for assertions.
 */
$key = getenv('STUB_API_KEY') ?: 'test-key-not-real';
$logDir = getenv('STUB_LOG_DIR') ?: sys_get_temp_dir();
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$raw = file_get_contents('php://input');
$body = json_decode((string)$raw, true);
header('Content-Type: application/json');

function out(int $code, array $p): void { http_response_code($code); echo json_encode($p); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(405, ['detail' => 'Method not allowed']);
if ($auth !== 'API-KEY ' . $key) out(401, ['detail' => 'Authentication credentials were not provided.']);

if ($path === '/api/v1/payment/create-session') {
    file_put_contents("$logDir/create-session.json", json_encode(['auth' => $auth, 'body' => $body], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    $items = $body['items'] ?? null;
    if (!is_array($items) || $items === []) out(400, ['success' => false, 'message' => 'Invalid request payload']);
    foreach ($items as $i) {
        if (!isset($i['id'], $i['name'], $i['price']) || strlen((string)$i['id']) > 50 || strlen((string)$i['name']) > 500 || !is_numeric($i['price'])) {
            out(400, ['success' => false, 'message' => 'Invalid request payload']);
        }
        if (isset($i['quantity'])) out(400, ['success' => false, 'message' => 'quantity is not a field']);
    }
    if (isset($body['user_id']) && strlen((string)$body['user_id']) > 50) out(400, ['success' => false, 'message' => 'Invalid request payload']);
    out(200, ['status_code' => 10, 'success' => true, 'message' => 'Payment session created successfully',
        'url' => 'https://checkout.example/checkout/stub-session-123?data=stub', 'expires_at' => '2026-10-10T12:00:00+00:00']);
}
if ($path === '/api/v1/hesab/webhooks/verify-signature') {
    file_put_contents("$logDir/verify-signature.json", json_encode(['auth' => $auth, 'body' => $body], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    $ok = ($body['signature'] ?? '') === 'good-signature' && ($body['timestamp'] ?? '') !== '';
    out(200, ['success' => $ok]);
}
out(404, ['detail' => 'Not found']);
