<?php
// Usage: php scripts/trip-planner/hash-password.php
// Prints a password_hash suitable for the private trip-planner config. The password is not stored.
if (PHP_SAPI !== 'cli') {
    exit(1);
}
fwrite(STDOUT, 'Password (min 12 chars): ');
if (stripos(PHP_OS, 'WIN') !== 0) {
    @system('stty -echo');
}
$password = trim((string)fgets(STDIN));
if (stripos(PHP_OS, 'WIN') !== 0) {
    @system('stty echo');
}
fwrite(STDOUT, PHP_EOL);
if (strlen($password) < 12) {
    fwrite(STDERR, "Too short.\n");
    exit(1);
}
echo password_hash($password, PASSWORD_DEFAULT), PHP_EOL;
