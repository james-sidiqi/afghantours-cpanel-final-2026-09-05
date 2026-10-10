<?php
// Usage: php scripts/booking/hash-password.php   (prompts; the password is not echoed or stored)
if (PHP_SAPI !== 'cli') { exit(1); }
fwrite(STDOUT, 'Password (min 12 chars): ');
if (stripos(PHP_OS, 'WIN') !== 0) { @system('stty -echo'); }
$p = trim((string)fgets(STDIN));
if (stripos(PHP_OS, 'WIN') !== 0) { @system('stty echo'); }
fwrite(STDOUT, PHP_EOL);
if (strlen($p) < 12) { fwrite(STDERR, "Too short.\n"); exit(1); }
echo password_hash($p, PASSWORD_DEFAULT), PHP_EOL;
