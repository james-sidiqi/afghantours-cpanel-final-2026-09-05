<?php
declare(strict_types=1);
/**
 * CLI only — retry queue + escalation runner for cPanel cron, e.g. every 5 minutes:
 *   php -q /home/jamesbon/afghantours.com/booking/lib/inquiry-cron.php
 * Retries failed/pending notification + acknowledgement deliveries with backoff, then runs
 * escalation (no-op while 'escalation.enabled' is false, the default). Prints a one-line summary.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/booking.php';
require_once __DIR__ . '/inquiry-mail.php';
try {
    $lockH = fopen(atb_data_dir() . DIRECTORY_SEPARATOR . '.cron.lock', 'c');
    if ($lockH === false || !flock($lockH, LOCK_EX | LOCK_NB)) { fwrite(STDOUT, "another run in progress\n"); exit(0); }
    $r = aim_process_retries();
    $e = aim_run_escalations();
    $f = count(aim_failures());
    fwrite(STDOUT, sprintf("[%s] retried=%d escalated=%d open_failures=%d escalation=%s\n", gmdate('c'), count($r), count($e), $f, aim_cfg()['escalation']['enabled'] ? 'on' : 'off'));
} catch (Throwable $t) {
    fwrite(STDERR, 'inquiry-cron error: ' . $t->getMessage() . "\n");
    exit(1);
}
