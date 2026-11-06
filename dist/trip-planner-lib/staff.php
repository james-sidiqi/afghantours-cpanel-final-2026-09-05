<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli' && PHP_SAPI !== 'phpdbg') {
    $atpSelf = realpath(__FILE__);
    $atpScript = realpath((string)($_SERVER['SCRIPT_FILENAME'] ?? ''));
    if ($atpSelf !== false && $atpSelf === $atpScript) {
        http_response_code(404);
        header('Content-Type: text/plain; charset=UTF-8');
        header('X-Robots-Tag: noindex, nofollow, noarchive');
        echo "Not found.\n";
        exit;
    }
    unset($atpSelf, $atpScript);
}

function atp_session_open(array $config): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
    session_name('ATPCSESSID');
    session_save_path($config['data_root'] . '/sessions');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => atp_app_path(),
        'domain' => '',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_httponly', '1');
    ini_set('session.cookie_samesite', 'Strict');
    ini_set('session.gc_maxlifetime', '3600');
    session_start();
    if (empty($_SESSION['auth'])) {
        return;
    }
    $now = time();
    $last = (int)($_SESSION['last'] ?? 0);
    if ($last !== 0 && ($now - $last) > 3600) {
        $_SESSION = [];
        session_regenerate_id(true);
        return;
    }
    $rotated = (int)($_SESSION['rotated'] ?? 0);
    if ($rotated !== 0 && ($now - $rotated) > 600) {
        session_regenerate_id(true);
        $_SESSION['rotated'] = $now;
    }
    $_SESSION['last'] = $now;
}

function atp_csrf(): string
{
    $token = $_SESSION['csrf'] ?? '';
    if (!is_string($token) || strlen($token) < 32) {
        $token = bin2hex(random_bytes(32));
        $_SESSION['csrf'] = $token;
    }
    return $token;
}

function atp_csrf_ok(): bool
{
    $sent = $_POST['csrf'] ?? '';
    $have = $_SESSION['csrf'] ?? '';
    return is_string($sent) && is_string($have) && $have !== '' && hash_equals($have, $sent);
}

function atp_page(int $status, string $title, string $body): void
{
    http_response_code($status);
    atp_common_headers();
    header('Content-Type: text/html; charset=UTF-8');
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">';
    echo '<title>' . atp_h($title) . '</title>';
    echo '<style>body{margin:0;font:16px/1.5 ui-sans-serif,system-ui,sans-serif;background:#fbf6ed;color:#101820}main{max-width:52rem;margin:0 auto;padding:1.25rem}h1{font-size:1.7rem;line-height:1.15}table{width:100%;border-collapse:collapse;background:#fff}th,td{border:1px solid rgba(16,24,32,.12);padding:.45rem .55rem;text-align:left;vertical-align:top}form,section{background:#fff;border:1px solid rgba(16,24,32,.12);border-radius:1rem;padding:1rem;margin:1rem 0}label{display:block;margin:.7rem 0}input,button{font:inherit}input{width:100%;max-width:24rem;padding:.55rem;border:1px solid #d8c9b5;border-radius:.7rem}button{background:#d6a23a;color:#101820;border:0;border-radius:999px;padding:.7rem 1.1rem;font-weight:700}a{color:#9a6517}.note{background:#efe8dc;padding:.8rem 1rem;border-radius:.8rem}</style>';
    echo '</head><body><main><h1>' . atp_h($title) . '</h1>' . $body . '</main></body></html>';
    exit;
}

function atp_login_form(string $message = ''): string
{
    $note = $message === '' ? '' : '<p class="note">' . atp_h($message) . '</p>';
    return $note . '<form method="post" action="' . atp_h(atp_app_path()) . '"><input type="hidden" name="action" value="login"><input type="hidden" name="csrf" value="' . atp_h(atp_csrf()) . '"><label>Username <input name="username" autocomplete="username" required maxlength="64"></label><label>Password <input type="password" name="password" autocomplete="current-password" required maxlength="200"></label><button type="submit">Sign in</button></form><p>Staging access is separate from this sign-in. Supplier registers are not shown on this screen.</p>';
}

function atp_render_list(array $items): string
{
    if ($items === []) {
        return '<p>None selected.</p>';
    }
    $html = '<ul>';
    foreach ($items as $item) {
        if (is_scalar($item)) {
            $html .= '<li>' . atp_h((string)$item) . '</li>';
        }
    }
    return $html . '</ul>';
}

function atp_render_submission(array $submission): string
{
    $contact = is_array($submission['contact'] ?? null) ? $submission['contact'] : [];
    $party = is_array($submission['party'] ?? null) ? $submission['party'] : [];
    $dates = is_array($submission['dates'] ?? null) ? $submission['dates'] : [];
    $html = '<dl>';
    foreach (['name', 'email', 'phone', 'preferred_contact', 'language'] as $key) {
        if (isset($contact[$key]) && is_scalar($contact[$key])) {
            $html .= '<dt>' . atp_h($key) . '</dt><dd>' . atp_h((string)$contact[$key]) . '</dd>';
        }
    }
    foreach (['adults', 'children', 'rooms'] as $key) {
        if (isset($party[$key]) && is_scalar($party[$key])) {
            $html .= '<dt>' . atp_h($key) . '</dt><dd>' . atp_h((string)$party[$key]) . '</dd>';
        }
    }
    foreach (['mode', 'start', 'end', 'flexible_note', 'duration_days'] as $key) {
        if (isset($dates[$key]) && is_scalar($dates[$key])) {
            $html .= '<dt>' . atp_h($key) . '</dt><dd>' . atp_h((string)$dates[$key]) . '</dd>';
        }
    }
    foreach (['pace', 'travel_style', 'accommodation_tier', 'tour_code', 'budget_note', 'notes'] as $key) {
        if (isset($submission[$key]) && is_scalar($submission[$key])) {
            $html .= '<dt>' . atp_h($key) . '</dt><dd>' . atp_h((string)$submission[$key]) . '</dd>';
        }
    }
    $html .= '</dl>';
    foreach (['interests', 'province_codes', 'activity_codes', 'hotel_ids', 'attraction_codes'] as $key) {
        $html .= '<h2>' . atp_h($key) . '</h2>' . atp_render_list(is_array($submission[$key] ?? null) ? $submission[$key] : []);
    }
    $html .= '<h2>Days</h2>';
    $days = is_array($submission['days'] ?? null) ? $submission['days'] : [];
    if ($days === []) {
        $html .= '<p>No day rows.</p>';
    }
    foreach ($days as $day) {
        if (!is_array($day)) {
            continue;
        }
        $html .= '<h3>Day ' . atp_h((string)($day['day_number'] ?? '')) . '</h3><dl>';
        foreach (['overnight_hub', 'travel_mode', 'notes'] as $key) {
            if (isset($day[$key]) && is_scalar($day[$key])) {
                $html .= '<dt>' . atp_h($key) . '</dt><dd>' . atp_h((string)$day[$key]) . '</dd>';
            }
        }
        $html .= '</dl>';
        $html .= atp_render_list(is_array($day['province_codes'] ?? null) ? $day['province_codes'] : []);
        $html .= atp_render_list(is_array($day['attraction_codes'] ?? null) ? $day['attraction_codes'] : []);
    }
    return $html;
}

function atp_staff_body(array $config): string
{
    $report = atp_inventory_report($config);
    $html = '<p class="note">M1 inventory and request inbox. Costing, quote edits, and client PDFs are a later milestone. This page lists record counts and hash checks only.</p>';
    $html .= '<form method="post" action="' . atp_h(atp_app_path()) . '"><input type="hidden" name="action" value="logout"><input type="hidden" name="csrf" value="' . atp_h(atp_csrf()) . '"><button type="submit">Sign out</button></form>';
    if (!$report['ok'] && ($report['error'] ?? '') === 'manifest_missing') {
        $html .= '<p>Inventory manifest is not in the configured store.</p>';
    } elseif (($report['error'] ?? '') === 'manifest_invalid') {
        $html .= '<p>Inventory manifest could not be read.</p>';
    } else {
        if (($report['error'] ?? '') === 'archive_missing') {
            $html .= '<p>Private archive is not in the configured store.</p>';
        }
        if ($report['counts'] !== []) {
            $html .= '<h2>Expected counts</h2><table><thead><tr><th>Register</th><th>Rows</th></tr></thead><tbody>';
            foreach ($report['counts'] as $key => $value) {
                $html .= '<tr><td>' . atp_h((string)$key) . '</td><td>' . atp_h((string)$value) . '</td></tr>';
            }
            $html .= '</tbody></table>';
        }
        $html .= '<h2>Archive files</h2><table><thead><tr><th>File</th><th>Role</th><th>Check</th><th>Expected rows</th><th>Counted rows</th></tr></thead><tbody>';
        foreach ($report['files'] as $file) {
            $html .= '<tr><td>' . atp_h((string)($file['path'] ?? '')) . '</td><td>' . atp_h((string)($file['role'] ?? '')) . '</td><td>' . atp_h((string)($file['status'] ?? '')) . '</td><td>' . atp_h($file['expected_rows'] === null ? '' : (string)$file['expected_rows']) . '</td><td>' . atp_h($file['actual_rows'] === null ? '' : (string)$file['actual_rows']) . '</td></tr>';
        }
        $html .= '</tbody></table>';
    }
    $lead = (string)($_GET['lead'] ?? '');
    if ($lead !== '') {
        $found = preg_match('/^AT-TP-\d{8}-[a-f0-9]{8}$/', $lead) === 1 ? atp_public_lead($config['data_root'], $lead) : null;
        $html .= '<h2>Request</h2>';
        if ($found === null) {
            $html .= '<p>That request was not found.</p>';
        } else {
            $html .= '<p>Reference ' . atp_h($found['reference']) . '. Received ' . atp_h($found['received_at']) . '. Status: received. Availability and prices are still to be confirmed.</p>';
            $html .= atp_render_submission($found['submission']);
        }
    }
    $inbox = atp_list_leads($config['data_root']);
    $html .= '<h2>Received requests (' . atp_h((string)$inbox['count']) . ')</h2>';
    if ($inbox['leads'] === []) {
        $html .= '<p>No requests stored.</p>';
    } else {
        $html .= '<table><thead><tr><th>Reference</th><th>Received</th><th>Name</th><th>Days</th><th>Dates</th></tr></thead><tbody>';
        foreach ($inbox['leads'] as $item) {
            $href = atp_app_path() . '?lead=' . rawurlencode($item['reference']);
            $html .= '<tr><td><a href="' . atp_h($href) . '">' . atp_h($item['reference']) . '</a></td><td>' . atp_h($item['received_at']) . '</td><td>' . atp_h($item['name']) . '</td><td>' . atp_h($item['duration_days'] === null ? '' : (string)$item['duration_days']) . '</td><td>' . atp_h($item['date_mode']) . '</td></tr>';
        }
        $html .= '</tbody></table>';
    }
    return $html;
}

function atp_staff_main(): void
{
    $boot = atp_boot();
    if (!$boot['ok']) {
        $message = match ($boot['error']) {
            'location' => 'Staff configuration must stay outside the website directory.',
            'storage' => 'The private storage directory could not be prepared.',
            'invalid' => 'Staff configuration is incomplete.',
            default => 'Staff sign-in is not configured.',
        };
        atp_page(503, 'Private calculator', '<p>' . atp_h($message) . '</p>');
    }
    $config = $boot['config'];
    if (!atp_staff_ready($config)) {
        atp_page(503, 'Private calculator', '<p>Staff sign-in is not configured.</p>');
    }
    atp_session_open($config);
    $action = (string)($_POST['action'] ?? '');
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
        if (!atp_csrf_ok()) {
            atp_page(403, 'Private calculator', atp_login_form('The form expired. Try again.'));
        }
        if ($action === 'logout') {
            $_SESSION = [];
            $params = session_get_cookie_params();
            setcookie(session_name(), '', [
                'expires' => time() - 42000,
                'path' => $params['path'],
                'domain' => $params['domain'],
                'secure' => (bool)$params['secure'],
                'httponly' => (bool)$params['httponly'],
                'samesite' => 'Strict',
            ]);
            session_destroy();
            header('Location: ' . atp_app_path(), true, 303);
            exit;
        }
        if ($action === 'login') {
            $ip = atp_ip_hash($config);
            if (atp_throttle($config, 'staff-login', $ip, 8, 900, false)) {
                atp_page(429, 'Private calculator', '<p>Too many sign-in attempts. Wait and try again.</p>');
            }
            $username = is_string($_POST['username'] ?? null) ? $_POST['username'] : '';
            $password = is_string($_POST['password'] ?? null) ? $_POST['password'] : '';
            if (strlen($password) > 200) {
                $password = '';
            }
            $hash = hash_equals((string)$config['staff_username'], $username)
                ? (string)$config['staff_password_hash']
                : ATP_DUMMY_PASSWORD_HASH;
            $accepted = $password !== '' && password_verify($password, $hash) && hash_equals((string)$config['staff_username'], $username);
            if (!$accepted) {
                atp_throttle($config, 'staff-login', $ip, 8, 900, true);
                if (getenv('ATP_LOGIN_DELAY') !== '0') {
                    usleep(250000);
                }
                atp_page(403, 'Private calculator', atp_login_form('Those details were not accepted.'));
            }
            session_regenerate_id(true);
            $_SESSION = [
                'auth' => true,
                'user' => (string)$config['staff_username'],
                'last' => time(),
                'rotated' => time(),
                'csrf' => bin2hex(random_bytes(32)),
            ];
            header('Location: ' . atp_app_path(), true, 303);
            exit;
        }
        atp_page(403, 'Private calculator', atp_login_form('That action was not accepted.'));
    }
    if (empty($_SESSION['auth'])) {
        atp_page(200, 'Private calculator', atp_login_form());
    }
    atp_page(200, 'Private calculator', atp_staff_body($config));
}
