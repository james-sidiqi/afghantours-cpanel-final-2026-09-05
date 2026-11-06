<?php
/**
 * Copy to /home/jamesbon/private/afghantours-trip-planner/config.php
 * OUTSIDE the staging document root and outside public_html.
 * Do not commit the filled-in file.
 *
 * Hash a password with: php scripts/trip-planner/hash-password.php
 * The password is typed into that script and is not stored by it.
 */
return [
    'staff_username' => 'operator',
    'staff_password_hash' => '__REPLACE_WITH_PHP_PASSWORD_HASH__',
    'ip_hash_key' => '__REPLACE_WITH_LONG_RANDOM_SECRET__',
    'data_root' => '/home/jamesbon/private/afghantours-trip-planner',
];
