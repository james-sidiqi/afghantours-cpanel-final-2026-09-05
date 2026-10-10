<?php
// Copy to /home/jamesbon/afghantours-private/booking-config.php  (OUTSIDE the website folder), chmod 600.
// Never commit the real file. Generate each hash with:  php scripts/booking/hash-password.php
return [
    'admin_users' => [
        // 'james'  => ['password_hash' => '$2y$12$...', 'role' => 'admin'],
        // 'edrees' => ['password_hash' => '$2y$12$...', 'role' => 'admin'],
        // 'office' => ['password_hash' => '$2y$12$...', 'role' => 'viewer'],
    ],
    'session_idle_minutes' => 30,
    'session_max_hours' => 8,
    'login_max_attempts' => 5,
    'login_window_minutes' => 15,
];
