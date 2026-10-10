<?php
declare(strict_types=1);

/**
 * AfghanTours — HesabPay webhook receiver.
 *
 * Register in the HesabPay dashboard (Developer → Webhooks) as:
 *   https://afghantours.com/payments/webhook.php   events: payment_success, payment_failure
 *
 * Flow (docs.hesab.com/webhooks/overview + verify-signatures; WooCommerce plugin webhook_handler):
 *   1. POST JSON; require "signature" and "timestamp".
 *   2. Verify by POSTing {signature, timestamp} to /api/v1/hesab/webhooks/verify-signature
 *      with "Authorization: API-KEY <key>". Trust only when response.success === true.
 *   3. Unverified → 403, nothing recorded as paid.
 *   4. Verified → record once (idempotent on transaction_id), update the matching intent
 *      (by user_id), optionally email info@afghantours.com, return 200.
 */

require __DIR__ . '/lib/hesabpay.php';

const MAX_WEBHOOK_BYTES = 65536;

$cfg = hesabpay_config();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond_json_and_exit(405, ['success' => false, 'error' => 'method_not_allowed']);
}

$raw = (string)file_get_contents('php://input', false, null, 0, MAX_WEBHOOK_BYTES + 1);
if (strlen($raw) > MAX_WEBHOOK_BYTES) {
    hesabpay_log($cfg, 'webhook_rejected', ['reason' => 'too_large']);
    respond_json_and_exit(413, ['success' => false, 'error' => 'payload_too_large']);
}
$data = json_decode($raw, true);
if (!is_array($data)) {
    hesabpay_log($cfg, 'webhook_rejected', ['reason' => 'invalid_json']);
    respond_json_and_exit(400, ['success' => false, 'error' => 'invalid_payload']);
}

$signature = is_scalar($data['signature'] ?? null) ? trim((string)$data['signature']) : '';
$timestamp = is_scalar($data['timestamp'] ?? null) ? trim((string)$data['timestamp']) : '';
if ($signature === '' || $timestamp === '' || strlen($signature) > 2048 || strlen($timestamp) > 64) {
    hesabpay_log($cfg, 'webhook_rejected', ['reason' => 'missing_signature_fields']);
    respond_json_and_exit(400, ['success' => false, 'error' => 'invalid_payload']);
}

// Verification needs the API key. Without it we cannot trust anything → refuse (HesabPay may retry later).
if (trim((string)$cfg['api_key']) === '' || !hesabpay_url_allowed((string)$cfg['api_base'])) {
    hesabpay_log($cfg, 'webhook_rejected', ['reason' => 'no_api_key_configured']);
    respond_json_and_exit(503, ['success' => false, 'error' => 'not_configured']);
}

$verify = hesabpay_post_json($cfg, HESABPAY_PATH_VERIFY_SIGNATURE, hesabpay_build_verify_payload($signature, $timestamp));
if (!$verify['ok'] || $verify['body'] === null || !hesabpay_verify_ok($verify['body'])) {
    hesabpay_log($cfg, 'webhook_rejected', [
        'reason' => 'signature_not_verified',
        'verify_http' => $verify['status'],
        'verify_error' => $verify['error'],
    ]);
    // Network/5xx from HesabPay → 503 so a retry can succeed; a definite "not valid" → 403.
    $code = ($verify['error'] !== '' || $verify['status'] >= 500 || $verify['status'] === 0) ? 503 : 403;
    respond_json_and_exit($code, ['success' => false, 'error' => 'invalid_signature']);
}

$w = hesabpay_normalize_webhook($data);
// Idempotency: HesabPay transaction_id (docs: "use transaction_id to make webhook processing idempotent").
// Fallback for payloads without one (e.g. undocumented failure payloads): signature+timestamp.
$idemKey = $w['transaction_id'] !== '' ? 'tx:' . $w['transaction_id'] : 'sig:' . $signature . '|' . $timestamp;

$intent = hesabpay_load_intent($cfg, $w['user_id']);
$amountMatches = null;
if ($intent !== null && $w['amount'] !== null) {
    $amountMatches = abs((float)$intent['amount'] - $w['amount']) < 0.005;
}

$record = [
    'received_at' => gmdate('c'),
    'verified' => true,
    'paid' => $w['paid'],
    'status_code' => $w['status_code'],
    'message' => $w['message'],
    'transaction_id' => $w['transaction_id'],
    'user_id' => $w['user_id'],
    'amount' => $w['amount'],
    'currency_assumed' => $cfg['currency'],
    'transaction_date' => $w['transaction_date'],
    'email' => $w['email'],
    'item_ids' => $w['item_ids'],
    'booking_reference' => $intent['booking_reference'] ?? ($w['item_ids'][0] ?? ''),
    'intent_found' => $intent !== null,
    'amount_matches_intent' => $amountMatches,
];

$result = hesabpay_record_webhook_once($cfg, $idemKey, $record);
if ($result === 'duplicate') {
    hesabpay_log($cfg, 'webhook_duplicate', ['transaction_id' => $w['transaction_id'], 'user_id' => $w['user_id']]);
    respond_json_and_exit(200, ['success' => true, 'duplicate' => true]);
}
if ($result === 'unwritable') {
    // Cannot persist → ask HesabPay to retry rather than silently dropping a payment.
    hesabpay_log($cfg, 'webhook_storage_error', ['transaction_id' => $w['transaction_id']]);
    respond_json_and_exit(503, ['success' => false, 'error' => 'storage_unavailable']);
}

if ($intent !== null) {
    $intent['status'] = $w['paid'] ? 'paid' : 'failed';
    $intent['transaction_id'] = $w['transaction_id'];
    $intent['webhook_at'] = gmdate('c');
    $intent['amount_matches'] = $amountMatches;
    hesabpay_save_intent($cfg, $intent);
}

hesabpay_log($cfg, 'webhook_verified', [
    'paid' => $w['paid'],
    'transaction_id' => $w['transaction_id'],
    'user_id' => $w['user_id'],
    'amount' => $w['amount'],
    'amount_matches_intent' => $amountMatches,
]);

if (!empty($cfg['notify_on_webhook'])) {
    $ref = $record['booking_reference'] !== '' ? $record['booking_reference'] : '(unknown)';
    $subject = ($w['paid'] ? 'Payment received' : 'Payment FAILED') . " (HesabPay): $ref";
    $lines = [
        $w['paid'] ? 'HesabPay reports a successful payment (signature verified).' : 'HesabPay reports a failed payment (signature verified).',
        '',
        'Booking reference: ' . $ref,
        'Amount: ' . ($w['amount'] !== null ? $w['amount'] . ' ' . $cfg['currency'] : '(not in payload)'),
        'Amount matches what the customer entered: ' . ($amountMatches === null ? 'unknown' : ($amountMatches ? 'yes' : 'NO - check')),
        'HesabPay transaction id: ' . ($w['transaction_id'] !== '' ? $w['transaction_id'] : '(none)'),
        'Transaction date: ' . ($w['transaction_date'] !== '' ? $w['transaction_date'] : '(none)'),
        'Internal id (user_id): ' . ($w['user_id'] !== '' ? $w['user_id'] : '(none)'),
        'Payer name: ' . ($intent['payer_name'] ?? '(unknown)'),
        'Payer email: ' . ($intent['payer_email'] ?? ($w['email'] !== '' ? $w['email'] : '(unknown)')),
        '',
        'Confirm in the HesabPay dashboard before treating the booking as settled.',
    ];
    hesabpay_mail($cfg, $subject, implode("\n", $lines), (string)($intent['payer_email'] ?? ''));
}

respond_json_and_exit(200, ['success' => true]);
