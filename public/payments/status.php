<?php
declare(strict_types=1);

/**
 * Public, non-secret payment status for the /pay/ page.
 * Returns only whether online payment is enabled and the configured currency/limits.
 */

require __DIR__ . '/lib/hesabpay.php';

$cfg = hesabpay_config();
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    header('Allow: GET');
    respond_json_and_exit(405, ['ok' => false]);
}
respond_json_and_exit(200, [
    'ok' => true,
    'enabled' => $cfg['mode'] !== 'disabled',
    'currency' => $cfg['currency'],
    'min_amount' => $cfg['min_amount'],
    'max_amount' => $cfg['max_amount'],
]);
