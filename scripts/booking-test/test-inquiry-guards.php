<?php
declare(strict_types=1);
// Exercise the actual guard functions without loading the handler or sending mail.
$source = file_get_contents(__DIR__ . '/../../public/tour-inquiry.php');
$start = strpos($source, 'function field(');
$end = strpos($source, 'function respond_json(');
if ($start === false || $end === false) throw new RuntimeException('Inquiry guards not found');
eval(substr($source, $start, $end - $start));
$count = 0;
function check_guard(bool $condition, string $label): void {
    global $count;
    if (!$condition) throw new RuntimeException($label);
    $count++;
    echo "PASS $label\n";
}
foreach (['localhost', '127.0.0.1', '[::1]:8080', '192.168.1.1', 'qa.test', 'qa.local', ''] as $host) {
    $_SERVER = ['HTTP_HOST' => $host, 'REMOTE_ADDR' => '203.0.113.12'];
    check_guard(!is_local_host(), 'Remote caller cannot gain local QA access using Host=' . $host);
}
$_SERVER = ['HTTP_HOST' => '127.0.0.1:8080', 'REMOTE_ADDR' => '127.0.0.1'];
check_guard(is_local_host(), 'Actual loopback development request remains available');
$_SERVER = ['HTTP_HOST' => 'afghantours.com', 'REMOTE_ADDR' => '127.0.0.1'];
check_guard(!is_local_host(), 'Production Host behind a loopback proxy is not local QA');
putenv('AFGHANTOURS_DRY_RUN_KEY');
$_POST = ['dry_run_key' => 'local-qa-only'];
check_guard(!dry_run_key_ok(), 'Missing configuration never accepts the old public fallback key');
$_POST = [];
$_SERVER['HTTP_X_AFGHANTOURS_DRY_RUN_KEY'] = 'local-qa-only';
check_guard(!dry_run_key_ok(), 'Missing configuration never accepts fallback through headers');
$testKey = bin2hex(random_bytes(24));
putenv('AFGHANTOURS_DRY_RUN_KEY=' . $testKey);
$_POST = ['dry_run_key' => 'wrong'];
unset($_SERVER['HTTP_X_AFGHANTOURS_DRY_RUN_KEY']);
check_guard(!dry_run_key_ok(), 'Wrong configured key rejected');
$_POST = ['dry_run_key' => $testKey];
check_guard(dry_run_key_ok(), 'Explicit matching configured key accepted');
$_POST = [];
$_SERVER['HTTP_X_AFGHANTOURS_DRY_RUN_KEY'] = $testKey;
check_guard(dry_run_key_ok(), 'Explicit configured key works through the supported header');
echo "Inquiry authorization guards: $count passed\n";
