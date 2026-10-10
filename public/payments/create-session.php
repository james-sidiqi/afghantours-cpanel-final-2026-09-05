<?php
declare(strict_types=1);

/**
 * AfghanTours — start an online payment (HesabPay).
 *
 * POST only, from /pay/. Behaviour depends on config "mode":
 *   disabled → friendly "online payment not yet available, contact us" (HTTP 503)
 *   link     → 303 redirect to the public HesabPay merchant link (no amount/reference passed)
 *   api      → create a HesabPay payment session server-side and 303 redirect to its hosted checkout URL
 * JSON clients (Accept: application/json or format=json) get JSON instead of HTML/redirects.
 *
 * No card data ever reaches this server: the customer enters card details on HesabPay's page.
 */

require __DIR__ . '/lib/hesabpay.php';

const MAX_REF = 40;
const MAX_NAME = 120;
const MAX_EMAIL = 190;
const MAX_DESC = 200;
const MAX_NOTES = 1000;

$cfg = hesabpay_config();
$json = wants_json_response();

function fail(int $code, string $title, string $message, string $reason): void {
    global $cfg, $json;
    hesabpay_log($cfg, 'create_session_rejected', ['reason' => $reason, 'http' => $code]);
    if ($json) {
        respond_json_and_exit($code, ['ok' => false, 'reason' => $reason, 'message' => $message]);
    }
    hesabpay_html_page($code, $title, $message);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    fail(405, 'Method not allowed', 'Please use the payment form on our website.', 'method');
}

// Honeypot (same field name as tour-inquiry.php).
if (post_field('website') !== '' || post_field('company_url') !== '') {
    hesabpay_log($cfg, 'create_session_honeypot');
    http_response_code(204);
    exit;
}

if (!hesabpay_same_origin_ok($cfg)) {
    fail(403, 'Request not accepted', 'This payment request did not come from the Afghan Tours website. Please start again from the payment page.', 'origin');
}

if (!hesabpay_rate_limit_ok($cfg, 'create')) {
    fail(429, 'Too many attempts', 'Too many payment attempts from this connection. Please wait a while or contact us.', 'rate_limit');
}

// Disabled is checked before validation so customers get the "not available yet" answer straight away.
if ($cfg['mode'] === 'disabled') {
    hesabpay_log($cfg, 'create_session_disabled');
    $msg = 'Online card payment is not available yet. Please contact our team to arrange payment for your booking.';
    if ($json) {
        respond_json_and_exit(503, ['ok' => false, 'mode' => 'disabled', 'reason' => 'disabled', 'message' => $msg]);
    }
    hesabpay_html_page(503, 'Online payment is not available yet', $msg);
}

// ---- Validate input -------------------------------------------------------
$ref = clamp_str(post_field('booking_reference'), MAX_REF);
$name = clamp_str(post_field('name'), MAX_NAME);
$email = clamp_str(post_field('email'), MAX_EMAIL);
$desc = clamp_str(post_field('description'), MAX_DESC);
$notes = clamp_str(post_field('notes'), MAX_NOTES);
$amountRaw = str_replace([',', ' '], '', post_field('amount'));
$currency = strtoupper(clamp_str(post_field('currency'), 3));

if ($ref === '' || !preg_match('/^[A-Za-z0-9][A-Za-z0-9 ._\/-]{1,39}$/', $ref)) {
    fail(400, 'Check your booking reference', 'Please enter the booking reference shown on your Afghan Tours invoice (letters, numbers, - / . _).', 'booking_reference');
}
if ($name === '') {
    fail(400, 'Name required', 'Please enter the name of the person paying.', 'name');
}
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fail(400, 'Email required', 'Please enter a valid email address so we can confirm your payment.', 'email');
}
if (!preg_match('/^\d{1,9}(\.\d{1,2})?$/', $amountRaw) || (float)$amountRaw <= 0) {
    fail(400, 'Check the amount', 'Please enter the amount from your invoice as a number (up to two decimal places).', 'amount');
}
$amount = round((float)$amountRaw, 2);
if ($cfg['min_amount'] !== null && $amount < $cfg['min_amount']) {
    fail(400, 'Amount too small', 'The amount is below the minimum accepted for online payment. Please contact us.', 'amount_min');
}
if ($cfg['max_amount'] !== null && $amount > $cfg['max_amount']) {
    fail(400, 'Amount too large', 'The amount is above the limit for online payment. Please contact us to arrange payment.', 'amount_max');
}
if ($currency !== '' && $currency !== $cfg['currency']) {
    fail(400, 'Currency mismatch', 'The payment currency on the form does not match our payment settings. Please contact us.', 'currency');
}

// Unique merchant reference sent as HesabPay user_id (≤50 chars) and returned in the webhook.
$userId = clamp_str('PAY-' . preg_replace('/[^A-Za-z0-9-]/', '', $ref) . '-' . gmdate('ymdHis') . '-' . bin2hex(random_bytes(3)), HESABPAY_MAX_USER_ID);

$intent = [
    'user_id' => $userId,
    'created_at' => gmdate('c'),
    'mode' => $cfg['mode'],
    'status' => 'pending',
    'booking_reference' => $ref,
    'payer_name' => $name,
    'payer_email' => $email,
    'description' => $desc,
    'notes' => $notes,
    'amount' => $amount,
    'currency' => $cfg['currency'],
    'ip_hash' => hash('sha256', client_ip()),
];

// ---- link mode ------------------------------------------------------------
if ($cfg['mode'] === 'link') {
    hesabpay_save_intent($cfg, $intent);
    hesabpay_log($cfg, 'create_session_link', ['user_id' => $userId, 'ref' => $ref, 'amount' => $amount]);
    if (!empty($cfg['notify_on_intent'])) {
        hesabpay_mail($cfg, "Payment started (HesabPay link): $ref",
            "A customer was sent to the public HesabPay link.\n\nReference: $ref\nName: $name\nEmail: $email\nAmount entered: $amount {$cfg['currency']}\nDescription: $desc\nNotes: $notes\nInternal id: $userId\n\nThe public link does not carry the amount or reference. Confirm the payment in the HesabPay dashboard.",
            $email);
    }
    if ($json) {
        respond_json_and_exit(200, ['ok' => true, 'mode' => 'link', 'redirect' => $cfg['public_link_url']]);
    }
    redirect_and_exit((string)$cfg['public_link_url']);
}

// ---- api mode -------------------------------------------------------------
$itemName = 'Afghan Tours booking ' . $ref . ($desc !== '' ? ' - ' . $desc : '');
$payload = hesabpay_build_session_payload([
    'user_id' => $userId,
    'item_id' => $ref,
    'item_name' => $itemName,
    'amount' => $amount,
    'email' => $email,
    'success_url' => (string)$cfg['success_url'],
    'failure_url' => (string)$cfg['cancel_url'],
]);

$res = hesabpay_post_json($cfg, HESABPAY_PATH_CREATE_SESSION, $payload);
$sessionUrl = $res['body'] !== null ? hesabpay_session_url_from_response($res['body']) : null;

if (!$res['ok'] || $sessionUrl === null) {
    hesabpay_log($cfg, 'create_session_api_error', [
        'user_id' => $userId,
        'http' => $res['status'],
        'error' => $res['error'],
        // HesabPay's error message only (docs: {"success":false,"message":...} or {"detail":...}).
        'hesab_message' => clamp_str((string)($res['body']['message'] ?? $res['body']['detail'] ?? ''), 200),
    ]);
    fail(502, 'Payment page unavailable', 'We could not open the secure HesabPay payment page right now. Nothing has been charged. Please try again later or contact us.', 'gateway');
}

$intent['status'] = 'session_created';
$intent['expires_at'] = clamp_str((string)($res['body']['expires_at'] ?? ''), 40);
hesabpay_save_intent($cfg, $intent);
hesabpay_log($cfg, 'create_session_api_ok', ['user_id' => $userId, 'ref' => $ref, 'amount' => $amount]);

if ($json) {
    respond_json_and_exit(200, ['ok' => true, 'mode' => 'api', 'redirect' => $sessionUrl]);
}
redirect_and_exit($sessionUrl);
