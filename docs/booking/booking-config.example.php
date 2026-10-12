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
    // Email (website@ = dedicated authenticated sender, approved by James 12 Oct 2026). Password is typed here on the server only — never in Git.
    'mail' => [
        'transport' => 'smtp',
        'smtp' => ['host' => 'mail.afghantours.com', 'port' => 465, 'secure' => 'ssl', 'user' => 'website@afghantours.com', 'pass' => 'SET-ON-SERVER-ONLY'],
        'from_email' => 'website@afghantours.com',   // From + envelope of every message; visible names stay AfghanTours / AfghanTours Reservations; Reply-To info@ / reservations@ / visitor
        'notify_from' => ['email' => 'website@afghantours.com', 'name' => 'AfghanTours Website'],
        'leadership' => ['james@afghantours.com', 'ramin@afghantours.com', 'mohammad@afghantours.com'],
        'leadership_copies' => 'direct',             // 'forwarder' once cPanel forwarders on info@/reservations@ are live
        'owners' => ['james' => 'james@afghantours.com', 'ramin' => 'ramin@afghantours.com', 'mohammad' => 'mohammad@afghantours.com'],
        'default_owner' => 'james',
    ],
    // Escalation (Asia/Kabul). Sat–Thu 08:00–20:00; Friday (5) closed. Keep 'enabled' => false until tested on the live site.
    'escalation' => ['enabled' => false, 'timezone' => 'Asia/Kabul', 'business_days' => [6,7,1,2,3,4], 'business_hours' => ['start' => '08:00', 'end' => '20:00']],
];
