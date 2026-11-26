<?php
declare(strict_types=1);

/**
 * Public, read-only departure feed for the static tour pages.
 * GET /booking/departures.php[?tour=<slug>]
 * Returns ONLY public fields of published, non-ended departures (no traveler data, no internal notes,
 * no proposed/draft departures). Source = private store (live) or the seed when the store is missing.
 */
require __DIR__ . '/lib/booking.php';

header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: public, max-age=60');
header('X-Robots-Tag: noindex');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET' && ($_SERVER['REQUEST_METHOD'] ?? '') !== 'HEAD') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

$tour = isset($_GET['tour']) && is_string($_GET['tour']) ? $_GET['tour'] : '';
if ($tour !== '' && !preg_match('/^[a-z0-9-]{1,120}$/', $tour)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Bad tour']);
    exit;
}

try {
    $payload = atb_public_payload($tour !== '' ? $tour : null);
} catch (Throwable $e) {
    error_log('[afghantours booking] departures feed failed: ' . $e->getMessage());
    http_response_code(503);
    echo json_encode(['ok' => false, 'message' => 'Unavailable']);
    exit;
}
if (!$payload['ok']) {
    http_response_code(503);
}
echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
