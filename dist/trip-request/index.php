<?php
declare(strict_types=1);

require __DIR__ . '/../trip-planner-lib/bootstrap.php';
require __DIR__ . '/../trip-planner-lib/contract.php';
require __DIR__ . '/../trip-planner-lib/intake.php';

function atp_wants_json(): bool
{
    $type = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
    if (str_contains($type, 'application/json')) {
        return true;
    }
    $accept = strtolower((string)($_SERVER['HTTP_ACCEPT'] ?? ''));
    return str_contains($accept, 'application/json') && !str_contains($accept, 'text/html');
}

function atp_respond(int $status, string $message, ?string $reference = null): void
{
    http_response_code($status);
    atp_common_headers();
    $ok = $status >= 200 && $status < 300 && $reference !== null;
    if (atp_wants_json()) {
        header('Content-Type: application/json; charset=UTF-8');
        $body = ['ok' => $ok, 'status' => $ok ? 'received' : 'rejected', 'message' => $message];
        if ($reference !== null) {
            $body['reference'] = $reference;
        }
        echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
    header('Content-Type: text/html; charset=UTF-8');
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Trip request</title>';
    echo '<style>body{margin:0;font:16px/1.5 ui-sans-serif,system-ui,sans-serif;background:#fbf6ed;color:#101820}main{max-width:40rem;margin:0 auto;padding:1.25rem}a{color:#9a6517}</style></head><body><main>';
    echo '<h1>Trip request</h1><p>' . atp_h($message) . '</p>';
    if ($reference !== null) {
        echo '<p>Reference <strong>' . atp_h($reference) . '</strong></p>';
    }
    echo '<p><a href="/trip-planner/">Back to the trip request form</a> · <a href="/contact/">Contact</a> · <a href="/custom-requests/">Custom requests</a></p>';
    echo '</main></body></html>';
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    atp_respond(405, 'Send a trip request from the staging form. Nothing was received.');
}

$length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($length > 65536) {
    atp_respond(413, 'That request is too large. Nothing was received.');
}

$boot = atp_boot();
if (!$boot['ok']) {
    atp_respond(503, 'The request desk is not available yet. Nothing was received.');
}
$config = $boot['config'];
$ip = atp_ip_hash($config);
if (atp_throttle($config, 'public-intake', $ip, 10, 3600, true)) {
    atp_respond(429, 'Too many requests. Wait and try again. Nothing was received.');
}

$contentType = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
if (str_contains($contentType, 'application/json')) {
    $raw = file_get_contents('php://input', false, null, 0, 65537);
    if ($raw === false || strlen($raw) > 65536) {
        atp_respond(413, 'That request is too large. Nothing was received.');
    }
    $parsed = json_decode($raw, true, 8);
    if (!is_array($parsed)) {
        atp_respond(400, 'The request could not be read. Nothing was received.');
    }
    $mode = 'json';
} else {
    if (($_FILES ?? []) !== []) {
        atp_respond(400, 'The request could not be accepted. Nothing was received.');
    }
    $parsed = $_POST;
    $mode = 'form';
}

$result = atp_validate_submission($parsed, $mode);
if (!$result['ok']) {
    atp_respond(400, 'The request could not be accepted. Check the form and try again. Nothing was received.');
}
if (($result['honeypot'] ?? '') !== '') {
    atp_respond(200, ATP_RECEIVED_MESSAGE, atp_new_reference());
}
$stored = atp_store_lead($config, $result['submission']);
if (!$stored['ok']) {
    atp_respond(500, 'The request could not be stored. Nothing was received.');
}
atp_respond(200, ATP_RECEIVED_MESSAGE, $stored['reference']);
