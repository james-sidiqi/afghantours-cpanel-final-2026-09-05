<?php
declare(strict_types=1);

/**
 * AfghanTours departure inventory — staff admin (/manage/).
 * Auth: users + password_hash in <private>/booking-config.php. Roles: admin (edit) | viewer (read-only).
 * Hardening: strict sessions, HttpOnly/SameSite=Strict/Secure cookie, idle + absolute timeout, CSRF on every POST,
 * file-based login rate limit, noindex, no-store, frame-deny, CSP without scripts.
 * Writes go to the private store only (never to the docroot / dist).
 */
require dirname(__DIR__) . '/booking/lib/booking.php';

header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");

$cfg = atb_config();
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
ini_set('session.cookie_httponly', '1');
session_name('atb_admin');
session_set_cookie_params(['lifetime' => 0, 'path' => '/manage/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
$sessDir = atb_data_dir() . DIRECTORY_SEPARATOR . 'sessions';
if (atb_store_available() && (is_dir($sessDir) || @mkdir($sessDir, 0700, true))) {
    session_save_path($sessDir);
}
session_start();

function h(mixed $v): string { return htmlspecialchars(is_scalar($v) ? (string)$v : '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function url(array $q = []): string { return '/manage/' . ($q ? '?' . http_build_query($q) : ''); }
function redirect(array $q = [], string $flash = '', string $kind = 'ok'): never {
    if ($flash !== '') $_SESSION['flash'] = [$kind, $flash];
    header('Location: ' . url($q), true, 303);
    exit;
}
function post(string $k): string { return atb_str($_POST[$k] ?? '', 4000); }
function csrf_token(): string {
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}
function csrf_field(): string { return '<input type="hidden" name="csrf" value="' . h(csrf_token()) . '">'; }
function client_ip(): string { return (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'); }

/* ------------------------------------------------------------- auth */

function rate_file(): string { return atb_data_dir() . DIRECTORY_SEPARATOR . 'login-attempts.json'; }
function rate_blocked(array $cfg, string $user): bool {
    $data = atb_read_json_file(rate_file()) ?? [];
    $window = (int)$cfg['login_window_minutes'] * 60;
    $now = time();
    foreach (['ip:' . hash('sha256', client_ip()), 'user:' . hash('sha256', strtolower($user))] as $k) {
        $hits = array_filter($data[$k] ?? [], static fn($t) => $t > $now - $window);
        if (count($hits) >= (int)$cfg['login_max_attempts']) return true;
    }
    return false;
}
function rate_record(array $cfg, string $user, bool $success): void {
    if (!atb_store_available()) return;
    atb_with_lock(static function () use ($cfg, $user, $success) {
        $data = atb_read_json_file(rate_file()) ?? [];
        $window = (int)$cfg['login_window_minutes'] * 60;
        $now = time();
        foreach ($data as $k => $hits) {
            $data[$k] = array_values(array_filter((array)$hits, static fn($t) => $t > $now - $window));
            if (!$data[$k]) unset($data[$k]);
        }
        $keys = ['ip:' . hash('sha256', client_ip()), 'user:' . hash('sha256', strtolower($user))];
        foreach ($keys as $k) {
            if ($success) unset($data[$k]); else $data[$k][] = $now;
        }
        atb_write_json_atomic(rate_file(), $data);
        return null;
    });
}

function current_user(array $cfg): ?array {
    $u = $_SESSION['user'] ?? null;
    if (!is_string($u) || !isset($cfg['admin_users'][$u])) return null;
    $now = time();
    if (($now - (int)($_SESSION['last'] ?? 0)) > (int)$cfg['session_idle_minutes'] * 60
        || ($now - (int)($_SESSION['started'] ?? 0)) > (int)$cfg['session_max_hours'] * 3600) {
        $_SESSION = [];
        session_regenerate_id(true);
        return null;
    }
    $_SESSION['last'] = $now;
    return ['name' => $u, 'role' => ($cfg['admin_users'][$u]['role'] ?? 'viewer') === 'admin' ? 'admin' : 'viewer'];
}

/* ------------------------------------------------------------- layout */

function page(string $title, string $body, ?array $user): never {
    $flash = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    $nav = '';
    if ($user) {
        $nav = '<nav><a href="' . h(url()) . '">Departures</a><a href="' . h(url(['a' => 'new'])) . '">New departure</a><a href="' . h(url(['a' => 'inquiries'])) . '">Inquiries</a><a href="' . h(url(['a' => 'tours'])) . '">Tours &amp; pricing</a><a href="' . h(url(['a' => 'blackouts'])) . '">Blackout dates</a><a href="' . h(url(['a' => 'settings'])) . '">Settings</a>'
            . '<form method="post" action="' . h(url(['a' => 'logout'])) . '" class="inline">' . csrf_field() . '<button class="link">Sign out ' . h($user['name']) . '</button></form></nav>';
    }
    $f = $flash ? '<p class="flash flash--' . h($flash[0]) . '">' . h($flash[1]) . '</p>' : '';
    echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>' . h($title) . ' · AfghanTours admin</title><style>'
        . 'body{margin:0;background:#fffdfa;color:#1c1d1b;font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}'
        . 'header{background:#111917;color:#fff;padding:.9rem 1.25rem;display:flex;flex-wrap:wrap;gap:.6rem 1.5rem;align-items:center}'
        . 'header strong{font:700 1.1rem Georgia,"Times New Roman",serif}header nav{display:flex;flex-wrap:wrap;gap:.3rem 1rem;align-items:center}header a,header .link{color:#f0d79a;text-decoration:none;font-weight:700;font-size:.85rem}'
        . 'main{max-width:1180px;margin:0 auto;padding:1.25rem}h1{font:700 1.8rem/1.1 Georgia,"Times New Roman",serif;margin:.5rem 0 1rem}h2{font:700 1.2rem Georgia,serif;margin:1.6rem 0 .6rem}'
        . 'table{width:100%;border-collapse:collapse;background:#fff;font-size:.85rem}th,td{border-bottom:1px solid #e6e1d6;padding:.5rem .55rem;text-align:left;vertical-align:top}th{background:#f6f2ea;font-size:.72rem;text-transform:uppercase;letter-spacing:.05em}'
        . '.wrap{overflow-x:auto}.muted{color:#6b6d66;font-size:.8rem}.tag{display:inline-block;padding:.1rem .45rem;border-radius:999px;background:#f1ebdf;font-size:.72rem;font-weight:700}.tag--warn{background:#fbe7c6}.tag--pub{background:#dceee0}'
        . 'form.card,.card{background:#fff;border:1px solid #e0dacd;border-radius:10px;padding:1rem;margin:0 0 1rem}label{display:block;font-weight:700;font-size:.8rem;margin:.55rem 0 .2rem}'
        . 'input,select,textarea{width:100%;box-sizing:border-box;padding:.55rem .6rem;border:1px solid #cbc6ba;border-radius:7px;font:inherit;background:#fff}textarea{min-height:70px}'
        . '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0 1rem}button{background:#111917;color:#fff;border:0;border-radius:999px;padding:.55rem 1rem;font-weight:800;cursor:pointer;margin:.35rem .35rem 0 0}'
        . 'button.alt{background:#fff;color:#111917;border:1px solid #111917}button.link{background:none;padding:0;margin:0}form.inline{display:inline}.flash{padding:.7rem .9rem;border-radius:8px}.flash--ok{background:#e3f1e5}.flash--err{background:#fbe2dc}'
        . '.filters a{margin-right:.8rem;font-weight:700;color:#7b5b23}@media(max-width:640px){main{padding:.8rem}th,td{padding:.45rem}}'
        . '</style></head><body><header><strong>AfghanTours · Departure inventory</strong>' . $nav . '</header><main>' . $f . $body . '</main></body></html>';
    exit;
}

function fail_page(int $code, string $title, string $message, ?array $user): never {
    http_response_code($code);
    page($title, '<h1>' . h($title) . '</h1><p>' . h($message) . '</p>', $user);
}

/* ------------------------------------------------------------- routing */

$action = isset($_GET['a']) && is_string($_GET['a']) ? $_GET['a'] : 'departures';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if (empty($cfg['admin_users'])) {
    fail_page(503, 'Admin not configured', 'Create the private config file (see docs/booking/ADMIN.md) with at least one user and a password hash. Nothing is editable until then.', null);
}
if (!atb_store_available()) {
    fail_page(503, 'Private store unavailable', 'The private booking folder is missing or not writable. See docs/booking/ADMIN.md.', null);
}

if ($method === 'POST') {
    $token = (string)($_POST['csrf'] ?? '');
    if ($token === '' || !hash_equals((string)($_SESSION['csrf'] ?? ''), $token)) {
        fail_page(403, 'Session expired', 'Security token missing or invalid. Reload the page and try again.', null);
    }
}

$user = current_user($cfg);

if ($action === 'login') {
    if ($method === 'POST') {
        $u = atb_str($_POST['username'] ?? '', 80);
        $p = (string)($_POST['password'] ?? '');
        if (rate_blocked($cfg, $u)) {
            http_response_code(429);
            redirect(['a' => 'login'], 'Too many attempts. Wait ' . (int)$cfg['login_window_minutes'] . ' minutes and try again.', 'err');
        }
        $hash = (string)($cfg['admin_users'][$u]['password_hash'] ?? '');
        $ok = $hash !== '' && password_verify($p, $hash);
        if (!$ok) {
            // Constant-ish time for unknown users.
            if ($hash === '') password_verify($p, '$2y$10$abcdefghijklmnopqrstuuJ0r6m3.rT1jYc7bWxZf5bqA2l9q1wDe');
            rate_record($cfg, $u, false);
            atb_audit($u !== '' ? $u : '(blank)', 'login_failed', ['ip_hash' => substr(hash('sha256', client_ip()), 0, 12)]);
            redirect(['a' => 'login'], 'Sign-in failed.', 'err');
        }
        rate_record($cfg, $u, true);
        session_regenerate_id(true);
        $_SESSION = ['user' => $u, 'started' => time(), 'last' => time(), 'csrf' => bin2hex(random_bytes(32))];
        atb_audit($u, 'login', []);
        redirect([], 'Signed in.');
    }
    if ($user) redirect();
    page('Sign in', '<h1>Sign in</h1><form class="card" method="post" action="' . h(url(['a' => 'login'])) . '" style="max-width:380px">' . csrf_field()
        . '<label for="u">Username</label><input id="u" name="username" autocomplete="username" required>'
        . '<label for="p">Password</label><input id="p" type="password" name="password" autocomplete="current-password" required>'
        . '<button>Sign in</button></form><p class="muted">Staff only. Attempts are rate-limited and logged.</p>', null);
}

if (!$user) {
    redirect(['a' => 'login']);
}

if ($action === 'logout' && $method === 'POST') {
    atb_audit($user['name'], 'logout', []);
    $_SESSION = [];
    session_regenerate_id(true);
    redirect(['a' => 'login'], 'Signed out.');
}

$canEdit = $user['role'] === 'admin';
if ($method === 'POST' && !$canEdit) {
    fail_page(403, 'Read-only account', 'Your account can view the inventory but not change it.', $user);
}

[$inv, $source] = atb_load_inventory();
$settings = $inv['settings'] ?? [];
$today = atb_today($settings['timezone'] ?? 'Asia/Kabul');
$deps = atb_effective_departures($inv);
$toursBySlug = [];
foreach ($inv['tours'] as $t) $toursBySlug[$t['slug']] = $t;

function dep_index(array $inv, string $id): ?int {
    foreach ($inv['departures'] as $i => $d) if (($d['id'] ?? '') === $id) return $i;
    return null;
}
function tour_options(array $inv, string $selected = ''): string {
    $o = '';
    foreach ($inv['tours'] as $t) {
        if (!in_array($t['category'] ?? '', ['A', 'B', 'C'], true) || ($t['active'] ?? true) === false) continue;
        $o .= '<option value="' . h($t['slug']) . '"' . ($t['slug'] === $selected ? ' selected' : '') . '>' . h($t['category'] . ' · ' . $t['name'] . ' (' . $t['duration_days'] . 'd)') . '</option>';
    }
    return $o;
}
function select(string $name, array $options, string $selected): string {
    $o = '<select name="' . h($name) . '" id="' . h($name) . '">';
    foreach ($options as $v => $label) $o .= '<option value="' . h($v) . '"' . ((string)$v === $selected ? ' selected' : '') . '>' . h($label) . '</option>';
    return $o . '</select>';
}
function nullable_int(string $v): ?int { return $v === '' ? null : (ctype_digit($v) ? (int)$v : -1); }
function save_or_fail(array $inv, array $user, string $what, array $detail, array $back): array {
    try {
        return atb_save_inventory($inv, $user['name'], $what, $detail);
    } catch (Throwable $e) {
        redirect($back, $e->getMessage(), 'err');
    }
}

/* ---- departure create/update ---- */
if (in_array($action, ['create', 'update'], true) && $method === 'POST') {
    $slug = post('tour_slug');
    $t = $toursBySlug[$slug] ?? null;
    $isNew = $action === 'create';
    $idx = $isNew ? null : dep_index($inv, post('id'));
    if (!$isNew && $idx === null) redirect([], 'Departure not found.', 'err');
    $base = $isNew ? [] : $inv['departures'][$idx];
    if ($t === null) redirect(['a' => 'new'], 'Choose a tour.', 'err');
    $start = post('start_date');
    $end = post('end_date');
    if ($end === '' && atb_is_iso_date($start)) $end = atb_expected_end($start, (int)$t['duration_days']);
    $type = post('departure_type') === 'private' ? 'private' : 'shared';
    $rule = atb_group_rule((int)$t['duration_days'], $settings);
    $amount = post('price_amount');
    $dep = array_replace($base, [
        'tour_code' => $t['code'],
        'tour_slug' => $slug,
        'start_date' => $start,
        'end_date' => $end,
        'duration_days' => (int)$t['duration_days'],
        'departure_type' => $type,
        'min_group_size' => nullable_int(post('min_group_size')) ?? ($type === 'private' ? 1 : $rule['min']),
        'max_capacity' => nullable_int(post('max_capacity')) ?? ($type === 'shared' && $rule['applies'] ? $rule['max'] : null),
        'group_exception_note' => atb_str(post('group_exception_note'), 500),
        'status' => post('status') ?: ($isNew ? 'draft' : ($base['status'] ?? 'draft')),
        'booking_cutoff' => post('booking_cutoff') !== '' ? post('booking_cutoff') : null,
        'public_notes' => atb_str(post('public_notes'), 300),
        'internal_notes' => atb_str(post('internal_notes'), 2000),
        'public_counts_approved' => post('public_counts_approved') === '1',
        'arrival_option' => $slug === 'weekend-in-kabul' && atb_is_iso_date($start) ? ([5 => 'fri-sun', 6 => 'sat-mon'][atb_weekday($start)] ?? null) : null,
        'date_check_override' => post('date_check_override') === '1',
    ]);
    $dep['price'] = [
        'amount' => $amount === '' ? null : (is_numeric($amount) && (float)$amount > 0 ? (float)$amount : -1),
        'currency' => 'USD',
        'basis' => $type === 'private' ? 'private_quotation' : 'per_person_shared_from',
        'price_status' => post('price_status') ?: 'reference_from_production',
    ];
    if ($type === 'private') $dep['price']['amount'] = null; // private = separate quotation, never the shared rate
    if (($dep['price']['amount'] ?? null) === -1) redirect($isNew ? ['a' => 'new'] : ['a' => 'edit', 'id' => $dep['id']], 'Price must be a positive number or blank.', 'err');
    if ($isNew) {
        $dep += ['published' => false, 'operational_approval' => 'pending', 'confirmed_count' => 0, 'pending_count' => 0, 'source' => 'admin', 'created_at' => atb_now_iso(), 'created_by' => $user['name']];
        $dep['id'] = atb_new_departure_id($inv['departures'], (string)$t['code'], $start, $type);
    }
    $dep['date_check'] = atb_is_iso_date($start) && atb_is_iso_date($end)
        ? ['inclusive_days' => atb_inclusive_days($start, $end), 'expected_end' => atb_expected_end($start, (int)$t['duration_days']), 'ok' => atb_inclusive_days($start, $end) === (int)$t['duration_days']]
        : ['ok' => false];
    $errors = atb_validate_departure($dep, $inv, $today, !empty($dep['published']));
    if ($dep['max_capacity'] === -1) $errors[] = 'Maximum capacity must be a whole number.';
    if ($errors) redirect($isNew ? ['a' => 'new'] : ['a' => 'edit', 'id' => $dep['id']], implode(' ', $errors), 'err');
    $dep['updated_at'] = atb_now_iso();
    $dep['updated_by'] = $user['name'];
    if ($isNew) $inv['departures'][] = $dep; else $inv['departures'][$idx] = $dep;
    save_or_fail($inv, $user, $isNew ? 'departure_create' : 'departure_update', ['id' => $dep['id']], ['a' => 'edit', 'id' => $dep['id']]);
    redirect(['a' => 'edit', 'id' => $dep['id']], $isNew ? 'Departure created (not public). Set capacity, then approve and publish when ready.' : 'Saved.');
}

/* ---- departure state actions ---- */
if ($action === 'op' && $method === 'POST') {
    $id = post('id');
    $idx = dep_index($inv, $id);
    if ($idx === null) redirect([], 'Departure not found.', 'err');
    $d = &$inv['departures'][$idx];
    $op = post('op');
    $msg = '';
    switch ($op) {
        case 'publish':
            if (($d['status'] ?? '') === 'proposed' || ($d['status'] ?? '') === 'draft') $d['status'] = 'scheduled';
            $errs = atb_validate_departure($d, $inv, $today, true);
            if ($errs) redirect(['a' => 'edit', 'id' => $id], 'Not published: ' . implode(' ', $errs), 'err');
            $d['published'] = true; $d['published_at'] = atb_now_iso(); $d['published_by'] = $user['name'];
            $msg = 'Published — now visible on the tour page.';
            break;
        case 'unpublish': $d['published'] = false; $msg = 'Unpublished — hidden from customers.'; break;
        case 'approve': $d['operational_approval'] = 'approved'; $d['approved_by'] = $user['name']; $d['approved_at'] = atb_now_iso(); $msg = 'Operational approval recorded. It shows as Confirmed only once the minimum of confirmed travelers is reached.'; break;
        case 'unapprove': $d['operational_approval'] = 'pending'; $msg = 'Approval withdrawn.'; break;
        case 'close': $d['status'] = 'closed'; $msg = 'Closed for requests.'; break;
        case 'reopen': $d['status'] = 'scheduled'; $msg = 'Reopened.'; break;
        case 'cancel': $d['status'] = 'cancelled'; $msg = 'Cancelled. Contact assigned travelers directly.'; break;
        case 'complete':
            if (($d['end_date'] ?? '9999') > $today) redirect(['a' => 'edit', 'id' => $id], 'A departure can be marked completed only on or after its end date.', 'err');
            $d['status'] = 'completed'; $d['published'] = false; $msg = 'Marked completed (kept in history).'; break;
        case 'fix_end':
            $t = $toursBySlug[$d['tour_slug']] ?? null;
            if (!$t) redirect([], 'Tour missing.', 'err');
            $old = $d['end_date'];
            $d['end_date'] = atb_expected_end($d['start_date'], (int)$t['duration_days']);
            $d['date_check'] = ['inclusive_days' => (int)$t['duration_days'], 'expected_end' => $d['end_date'], 'ok' => true, 'note' => 'End date corrected from ' . $old . ' by ' . $user['name']];
            $msg = 'End date set to ' . $d['end_date'] . ' (was ' . $old . ').';
            break;
        default: redirect(['a' => 'edit', 'id' => $id], 'Unknown action.', 'err');
    }
    unset($d);
    save_or_fail($inv, $user, 'departure_' . $op, ['id' => $id], ['a' => 'edit', 'id' => $id]);
    if (in_array($op, ['approve', 'unapprove'], true)) sync_departure_confirmed_on($id, $user['name'], $today);
    redirect(['a' => 'edit', 'id' => $id], $msg);
}

/* ---- booking records (booking status is separate from departure status) ---- */
const BOOKING_STATUS = ['pending' => 'Requested (not yet accepted)', 'confirmed' => 'Booking confirmed', 'cancelled' => 'Booking cancelled'];
const PAYMENT_NOTE = ['not_recorded' => 'Not recorded', 'deposit_recorded' => 'Deposit recorded', 'paid_recorded' => 'Paid in full recorded'];

function money_or_null(string $v): ?float { return $v !== '' && is_numeric($v) && (float)$v >= 0 ? round((float)$v, 2) : null; }

/** Stamp booking-time facts the first time a booking is confirmed (spec 10 Oct Part 1 §5). */
function stamp_booking(array &$tr, ?array $dep, string $today, array $settings, string $actor): void {
    if (($tr['status'] ?? '') !== 'confirmed' || !empty($tr['booking_confirmed_at'])) return;
    $st = $dep ? atb_compute_status($dep, $today, $settings) : ['key' => 'unknown'];
    $tr['booking_confirmed_at'] = atb_now_iso();
    $tr['booking_confirmed_by'] = $actor;
    $tr['departure_status_at_booking'] = $dep ? atb_status_text($st['key'], $dep, $settings) : 'unknown';
    $tr['required_minimum_at_booking'] = $dep['min_group_size'] ?? null;
}

/** Record the date a departure first became Confirmed (minimum confirmed travelers + operational approval). */
function sync_departure_confirmed_on(string $depId, string $actor, string $today): void {
    // Read the file fresh: atb_load_inventory() is cached per request and may predate a save made in this request.
    $inv = atb_read_json_file(atb_data_dir() . DIRECTORY_SEPARATOR . 'inventory.json');
    if (!is_array($inv)) return;
    $eff = atb_find_departure(atb_effective_departures($inv), $depId);
    if (!$eff) return;
    $min = atb_int($eff['min_group_size'] ?? null, null);
    $reached = $min && (int)$eff['confirmed_count'] >= $min && ($eff['operational_approval'] ?? '') === 'approved';
    foreach ($inv['departures'] as &$d) {
        if ($d['id'] !== $depId) continue;
        if ($reached && empty($d['confirmed_on'])) { $d['confirmed_on'] = $today; $changed = true; }
        if (!$reached && !empty($d['confirmed_on']) && empty($d['confirmed_on_locked'])) { $d['confirmed_on_history'][] = $d['confirmed_on']; $d['confirmed_on'] = null; $changed = true; }
    }
    unset($d);
    if (!empty($changed)) {
        try { atb_save_inventory($inv, $actor, 'departure_confirmed_on_sync', ['id' => $depId]); }
        catch (Throwable $e) { error_log('[afghantours admin] confirmed_on sync failed: ' . $e->getMessage()); }
    }
}

/* ---- travelers ---- */
if ($action === 'traveler' && $method === 'POST') {
    $depId = post('departure_id');
    if (atb_find_departure($deps, $depId) === null) redirect([], 'Departure not found.', 'err');
    $travelers = atb_load_travelers();
    $op = post('op');
    if ($op === 'add') {
        $name = atb_str(post('name'), 120);
        if ($name === '') redirect(['a' => 'edit', 'id' => $depId], 'Traveler name is required.', 'err');
        $size = max(1, min(50, (int)atb_int(post('party_size'), 1)));
        $status = in_array(post('status'), ['pending', 'confirmed'], true) ? post('status') : 'pending';
        $travelers[] = [
            'id' => 'TRV-' . bin2hex(random_bytes(5)), 'departure_id' => $depId, 'name' => $name,
            'email' => atb_str(post('email'), 190), 'whatsapp' => atb_str(post('whatsapp'), 40), 'country' => atb_str(post('country'), 80),
            'party_size' => $size, 'status' => $status,
            'payment_status' => in_array(post('payment_status'), ['not_recorded', 'deposit_recorded', 'paid_recorded'], true) ? post('payment_status') : 'not_recorded',
            'inquiry_id' => atb_str(post('inquiry_id'), 60), 'notes' => atb_str(post('notes'), 1000),
            'amount_paid' => money_or_null(post('amount_paid')), 'balance_due' => money_or_null(post('balance_due')),
            'balance_due_date' => atb_is_iso_date(post('balance_due_date')) ? post('balance_due_date') : null, 'currency' => 'USD',
            'created_at' => atb_now_iso(), 'created_by' => $user['name'],
        ];
        $new = array_key_last($travelers);
        stamp_booking($travelers[$new], atb_find_departure($deps, $depId), $today, $settings, $user['name']);
        atb_save_travelers($travelers, $user['name'], 'traveler_add', ['departure_id' => $depId, 'status' => $status, 'party_size' => $size]);
        sync_departure_confirmed_on($depId, $user['name'], $today);
        redirect(['a' => 'edit', 'id' => $depId], 'Traveler added — ' . BOOKING_STATUS[$status] . '.');
    }
    if ($op === 'update') {
        $tid = post('traveler_id');
        foreach ($travelers as &$tr) {
            if (($tr['id'] ?? '') !== $tid || ($tr['departure_id'] ?? '') !== $depId) continue;
            if (in_array(post('status'), ['pending', 'confirmed', 'cancelled'], true)) $tr['status'] = post('status');
            if (in_array(post('payment_status'), ['not_recorded', 'deposit_recorded', 'paid_recorded'], true)) $tr['payment_status'] = post('payment_status');
            foreach (['amount_paid', 'balance_due'] as $mk) if (isset($_POST[$mk])) $tr[$mk] = money_or_null(post($mk));
            if (isset($_POST['balance_due_date'])) $tr['balance_due_date'] = atb_is_iso_date(post('balance_due_date')) ? post('balance_due_date') : null;
            stamp_booking($tr, atb_find_departure($deps, $depId), $today, $settings, $user['name']);
            $tr['updated_at'] = atb_now_iso(); $tr['updated_by'] = $user['name'];
        }
        unset($tr);
        atb_save_travelers($travelers, $user['name'], 'traveler_update', ['departure_id' => $depId, 'traveler_id' => $tid, 'status' => post('status')]);
        sync_departure_confirmed_on($depId, $user['name'], $today);
        redirect(['a' => 'edit', 'id' => $depId], 'Traveler updated.');
    }
    redirect(['a' => 'edit', 'id' => $depId], 'Unknown traveler action.', 'err');
}

/* ---- tours / pricing / private availability ---- */
if ($action === 'tour_save' && $method === 'POST') {
    $slug = post('slug');
    foreach ($inv['tours'] as &$t) {
        if ($t['slug'] !== $slug) continue;
        $oldAmount = $t['price']['reference_amount'] ?? null;
        $amount = post('reference_amount');
        if ($amount !== '' && !(is_numeric($amount) && (float)$amount > 0)) redirect(['a' => 'tours'], 'Price must be a positive number or blank.', 'err');
        $t['price']['reference_amount'] = $amount === '' ? null : (float)$amount;
        $t['price']['price_status'] = in_array(post('price_status'), ['reference_from_production', 'approved', 'price_on_request'], true) ? post('price_status') : 'reference_from_production';
        $t['price']['display_on_site'] = post('display_on_site') === '1';
        $t['price']['needs_james_review'] = $t['price']['price_status'] === 'reference_from_production';
        if (in_array($t['category'], ['A', 'B', 'C'], true)) {
            $t['private_available'] = post('private_available') === '1';
            $t['private_note'] = atb_str(post('private_note'), 300);
        }
        $t['updated_at'] = atb_now_iso(); $t['updated_by'] = $user['name'];
        // Carry the change to this tour's shared departures that still use the old reference price.
        foreach ($inv['departures'] as &$dd) {
            if (($dd['tour_slug'] ?? '') !== $slug || ($dd['departure_type'] ?? '') === 'private') continue;
            if (($dd['price']['amount'] ?? null) == $oldAmount) {
                $dd['price']['amount'] = $t['price']['reference_amount'];
                $dd['price']['price_status'] = $t['price']['price_status'];
            }
        }
        unset($dd);
    }
    unset($t);
    save_or_fail($inv, $user, 'tour_update', ['slug' => $slug], ['a' => 'tours']);
    redirect(['a' => 'tours'], 'Tour saved. Note: the static page snapshot updates on the next site build; live departure prices update now.');
}

/* ---- blackouts ---- */
if ($action === 'blackout' && $method === 'POST') {
    $op = post('op');
    if ($op === 'add') {
        $s = post('start_date'); $e = post('end_date');
        if (!atb_is_iso_date($s) || !atb_is_iso_date($e) || $e < $s || post('name') === '') redirect(['a' => 'blackouts'], 'Name and a valid date range are required.', 'err');
        $applies = array_values(array_filter(array_map('trim', explode(',', post('applies_to') ?: '*'))));
        $inv['blackouts'][] = ['id' => 'BO-' . strtoupper(bin2hex(random_bytes(3))), 'name' => atb_str(post('name'), 120), 'start_date' => $s, 'end_date' => $e,
            'tags' => [], 'applies_to' => $applies ?: ['*'], 'blocking' => post('blocking') === '1', 'confirmed' => post('confirmed') === '1', 'source' => 'admin: ' . $user['name']];
    } elseif ($op === 'confirm' || $op === 'delete') {
        foreach ($inv['blackouts'] as $i => $b) {
            if ($b['id'] !== post('id')) continue;
            if ($op === 'delete') unset($inv['blackouts'][$i]); else { $inv['blackouts'][$i]['confirmed'] = true; $inv['blackouts'][$i]['confirmed_by'] = $user['name']; $inv['blackouts'][$i]['confirmed_at'] = atb_now_iso(); }
        }
        $inv['blackouts'] = array_values($inv['blackouts']);
    }
    save_or_fail($inv, $user, 'blackout_' . $op, ['id' => post('id')], ['a' => 'blackouts']);
    redirect(['a' => 'blackouts'], 'Blackout dates updated.');
}

/* ---- settings ---- */
if ($action === 'settings_save' && $method === 'POST') {
    $inv['settings']['usd_confirmed'] = post('usd_confirmed') === '1';
    $inv['settings']['show_public_capacity'] = post('show_public_capacity') === '1';
    $inv['settings']['show_public_confirmed_counts'] = post('show_public_confirmed_counts') === '1';
    $inv['settings']['limited_places_threshold'] = max(1, min(10, (int)atb_int(post('limited_places_threshold'), 2)));
    save_or_fail($inv, $user, 'settings_update', [], ['a' => 'settings']);
    redirect(['a' => 'settings'], 'Settings saved.');
}

/* ---- inquiries ---- */
if ($action === 'inquiry' && $method === 'POST') {
    $id = post('id');
    $op = post('op');
    if ($op === 'status' && in_array(post('status'), ['new', 'contacted', 'approved', 'declined', 'closed'], true)) {
        atb_update_inquiry($id, ['status' => post('status')], $user['name']);
        redirect(['a' => 'inquiry', 'id' => $id], 'Inquiry status updated.');
    }
    if ($op === 'assign') {
        $depId = post('departure_id');
        $dep = atb_find_departure($deps, $depId);
        $inq = null;
        foreach (atb_load_inquiries() as $r) if ($r['id'] === $id) $inq = $r;
        if (!$dep || !$inq) redirect(['a' => 'inquiry', 'id' => $id], 'Inquiry or departure not found.', 'err');
        $travelers = atb_load_travelers();
        $travelers[] = ['id' => 'TRV-' . bin2hex(random_bytes(5)), 'departure_id' => $depId, 'name' => (string)($inq['name'] ?? ''), 'email' => (string)($inq['email'] ?? ''),
            'whatsapp' => (string)($inq['whatsapp'] ?? ''), 'country' => (string)($inq['country'] ?? ''), 'party_size' => max(1, (int)atb_int($inq['travelers'] ?? 1, 1)),
            'status' => 'pending', 'payment_status' => 'not_recorded', 'inquiry_id' => $id, 'notes' => '', 'created_at' => atb_now_iso(), 'created_by' => $user['name']];
        atb_save_travelers($travelers, $user['name'], 'traveler_assign', ['departure_id' => $depId, 'inquiry_id' => $id]);
        atb_update_inquiry($id, ['assigned_departure' => $depId, 'status' => 'contacted'], $user['name']);
        redirect(['a' => 'edit', 'id' => $depId], 'Traveler added to the departure as pending. Confirm them once they have committed.');
    }
    redirect(['a' => 'inquiries'], 'Unknown action.', 'err');
}

/* ================================================================ views */

/** Booking confirmation record + email template (spec 10 Oct Part 1 §5). */
function booking_confirmation_text(array $tr, ?array $d, ?array $t, string $today, array $settings): array {
    $money = static fn($v) => $v === null || $v === '' ? 'not recorded' : 'USD ' . number_format((float)$v, 2);
    $depStatus = $d ? atb_status_text(atb_compute_status($d, $today, $settings)['key'], $d, $settings) : 'unknown';
    $min = $d['min_group_size'] ?? null;
    $fields = [
        'Tour' => (string)($t['name'] ?? ($d['tour_slug'] ?? '')),
        'Departure dates' => $d ? atb_format_range((string)$d['start_date'], (string)$d['end_date']) : '',
        'Traveler(s)' => (string)$tr['name'] . ' (party of ' . (int)($tr['party_size'] ?? 1) . ')',
        'Booking status' => BOOKING_STATUS[$tr['status']] ?? (string)$tr['status'],
        'Departure status at time of booking' => (string)($tr['departure_status_at_booking'] ?? $depStatus),
        'Departure status now' => $depStatus,
        'Required minimum group size' => $min ? $min . ' travelers' : 'to be confirmed by AfghanTours',
        'Date departure became confirmed' => (string)($d['confirmed_on'] ?? 'not yet — we will tell you as soon as it is'),
        'Amount paid' => $money($tr['amount_paid'] ?? null),
        'Remaining balance' => $money($tr['balance_due'] ?? null),
        'Balance due date' => (string)($tr['balance_due_date'] ?? 'not applicable / not set'),
        'Booking reference' => (string)$tr['id'],
    ];
    $lines = ['Dear ' . $tr['name'] . ',', '', 'Thank you for booking with AfghanTours. Your booking is confirmed.', ''];
    foreach ($fields as $k => $v) if ($k !== 'Departure status now') $lines[] = $k . ': ' . $v;
    $lines[] = '';
    if (empty($d['confirmed_on'])) {
        $lines[] = 'Your place is booked. This scheduled departure is still open and awaiting its minimum number of travelers' . ($min ? ' (' . $min . ')' : '') . '. We will let you know as soon as the departure is confirmed. If the minimum is not reached, we will offer you another departure, an alternative itinerary, a private version of the journey at a separately quoted price, or cancellation with a 100% refund of the amount paid to James Tourist & Travel Agency for this tour (see our Scheduled Departures and Minimum Group Size policy).';
    } else {
        $lines[] = 'This departure is confirmed and will operate.';
    }
    $lines = array_merge($lines, ['', 'With best wishes,', 'AfghanTours', 'James Tourist & Travel Agency · Operating as AfghanTours.com · Tour Operator License ATO-KBL-1617', 'info@afghantours.com · WhatsApp +93 780 123 456']);
    return ['fields' => $fields, 'email' => implode("\n", $lines)];
}

function status_tag(array $d, string $today, array $settings): string {
    $st = atb_compute_status($d, $today, $settings);
    $pub = (!empty($d['published']) && atb_is_public($d, $today)) ? '<span class="tag tag--pub">public</span>' : '<span class="tag">not public</span>';
    $warn = (isset($d['date_check']['ok']) && $d['date_check']['ok'] === false) ? ' <span class="tag tag--warn">date check</span>' : '';
    $cap = ($d['max_capacity'] ?? null) === null && in_array($d['status'] ?? '', ['scheduled', 'on_request'], true) ? ' <span class="tag tag--warn">no capacity</span>' : '';
    return h($st['label']) . '<br>' . $pub . $warn . $cap;
}

if ($action === 'departures') {
    $view = isset($_GET['view']) && is_string($_GET['view']) ? $_GET['view'] : 'upcoming';
    $tourFilter = isset($_GET['tour']) && is_string($_GET['tour']) ? $_GET['tour'] : '';
    $rows = array_filter($deps, static function ($d) use ($view, $today, $tourFilter) {
        if ($tourFilter !== '' && $d['tour_slug'] !== $tourFilter) return false;
        return match ($view) {
            'proposed' => in_array($d['status'], ['proposed', 'draft'], true),
            'history' => $d['end_date'] < $today || in_array($d['status'], ['completed', 'cancelled'], true),
            'all' => true,
            default => $d['end_date'] >= $today && !in_array($d['status'], ['proposed', 'draft', 'completed'], true),
        };
    });
    usort($rows, static fn($a, $b) => strcmp($a['start_date'], $b['start_date']));
    $b = '<h1>Departures</h1><p class="muted">Inventory source: <strong>' . h($source) . '</strong> · revision ' . h($inv['revision'] ?? '') . ' · today (Kabul) ' . h($today) . '. Only <em>confirmed</em> travelers count toward the minimum. Nothing becomes Confirmed without your approval.</p>';
    $b .= '<p class="filters">';
    foreach (['upcoming' => 'Upcoming (scheduled)', 'proposed' => 'Proposed / draft', 'history' => 'History', 'all' => 'All'] as $k => $l) {
        $b .= '<a href="' . h(url(['view' => $k, 'tour' => $tourFilter])) . '"' . ($view === $k ? ' style="text-decoration:underline"' : '') . '>' . h($l) . '</a>';
    }
    $b .= '</p><form method="get" action="/manage/" class="card" style="max-width:520px"><input type="hidden" name="view" value="' . h($view) . '"><label for="tour">Filter by tour</label><select name="tour" id="tour"><option value="">All tours</option>' . tour_options($inv, $tourFilter) . '</select><button class="alt">Filter</button></form>';
    $b .= '<div class="wrap"><table><thead><tr><th>Departure</th><th>Tour</th><th>Dates</th><th>Type</th><th>Min / Max</th><th>Confirmed / Pending</th><th>Approval</th><th>Status</th></tr></thead><tbody>';
    foreach ($rows as $d) {
        $t = $toursBySlug[$d['tour_slug']] ?? ['name' => $d['tour_slug']];
        $b .= '<tr><td><a href="' . h(url(['a' => 'edit', 'id' => $d['id']])) . '">' . h($d['id']) . '</a></td><td>' . h($t['name']) . '</td><td>' . h(atb_format_range($d['start_date'], $d['end_date'])) . '<br><span class="muted">' . h($d['start_date'] . ' → ' . $d['end_date']) . '</span></td>'
            . '<td>' . h($d['departure_type']) . ($d['arrival_option'] ? '<br><span class="muted">' . h($d['arrival_option']) . '</span>' : '') . '</td><td>' . h($d['min_group_size']) . ' / ' . h($d['max_capacity'] ?? 'not set') . '</td>'
            . '<td>' . h($d['confirmed_count'] ?? 0) . ' / ' . h($d['pending_count'] ?? 0) . '</td><td>' . h($d['operational_approval'] ?? 'pending') . '</td><td>' . status_tag($d, $today, $settings) . '</td></tr>';
    }
    if (!$rows) $b .= '<tr><td colspan="8" class="muted">No departures in this view.</td></tr>';
    page('Departures', $b . '</tbody></table></div><p class="muted">' . count($rows) . ' shown.</p>', $user);
}

function departure_form(array $inv, array $d, bool $isNew, bool $canEdit): string {
    $f = '<form class="card" method="post" action="' . h(url(['a' => $isNew ? 'create' : 'update'])) . '">' . csrf_field();
    if (!$isNew) $f .= '<input type="hidden" name="id" value="' . h($d['id']) . '">';
    $f .= '<div class="grid"><div><label for="tour_slug">Tour</label><select name="tour_slug" id="tour_slug"' . ($isNew ? '' : ' disabled') . '>' . tour_options($inv, (string)($d['tour_slug'] ?? '')) . '</select>' . ($isNew ? '' : '<input type="hidden" name="tour_slug" value="' . h($d['tour_slug']) . '">') . '</div>'
        . '<div><label for="start_date">Start date</label><input type="date" name="start_date" id="start_date" required value="' . h($d['start_date'] ?? '') . '"></div>'
        . '<div><label for="end_date">End date <span class="muted">(blank = start + duration − 1)</span></label><input type="date" name="end_date" id="end_date" value="' . h($d['end_date'] ?? '') . '"></div>'
        . '<div><label for="departure_type">Type</label>' . select('departure_type', ['shared' => 'Shared group', 'private' => 'Private (quoted separately)'], (string)($d['departure_type'] ?? 'shared')) . '</div>'
        . '<div><label for="min_group_size">Minimum travelers</label><input type="number" min="1" name="min_group_size" id="min_group_size" value="' . h($d['min_group_size'] ?? '') . '" placeholder="6 for 5+ day tours; owner sets for ≤4 days"></div>'
        . '<div><label for="max_capacity">Maximum capacity</label><input type="number" min="1" name="max_capacity" id="max_capacity" value="' . h($d['max_capacity'] ?? '') . '" placeholder="required before publishing"></div>'
        . '<div><label for="group_exception_note">Approved group-size exception</label><input name="group_exception_note" id="group_exception_note" value="' . h($d['group_exception_note'] ?? '') . '" placeholder="Only when numbers differ from 6–18 — who approved and why"></div>'
        . '<div><label for="status">Status</label>' . select('status', ['draft' => 'Draft', 'proposed' => 'Proposed', 'scheduled' => 'Scheduled', 'on_request' => 'On request', 'closed' => 'Closed', 'cancelled' => 'Cancelled', 'completed' => 'Completed'], (string)($d['status'] ?? 'draft')) . '</div>'
        . '<div><label for="booking_cutoff">Booking cutoff</label><input type="date" name="booking_cutoff" id="booking_cutoff" value="' . h($d['booking_cutoff'] ?? '') . '"></div>'
        . '<div><label for="price_amount">Shared price from (USD per person)</label><input name="price_amount" id="price_amount" inputmode="decimal" value="' . h($d['price']['amount'] ?? '') . '" placeholder="blank = Price on request"></div>'
        . '<div><label for="price_status">Price status</label>' . select('price_status', ['reference_from_production' => 'Reference from production (needs review)', 'approved' => 'Approved', 'price_on_request' => 'Price on request'], (string)($d['price']['price_status'] ?? 'reference_from_production')) . '</div>'
        . '</div><label for="public_notes">Public note (shown to customers)</label><input name="public_notes" id="public_notes" maxlength="300" value="' . h($d['public_notes'] ?? '') . '">'
        . '<label for="internal_notes">Internal notes (staff only, never public)</label><textarea name="internal_notes" id="internal_notes">' . h($d['internal_notes'] ?? '') . '</textarea>'
        . '<label><input type="checkbox" name="public_counts_approved" value="1" style="width:auto"' . (!empty($d['public_counts_approved']) ? ' checked' : '') . '> Allow “x of 3 travelers confirmed” on the site (also needs the global setting)</label>'
        . '<label><input type="checkbox" name="date_check_override" value="1" style="width:auto"' . (!empty($d['date_check_override']) ? ' checked' : '') . '> Keep dates even though they do not match the tour duration</label>';
    return $f . ($canEdit ? '<button>' . ($isNew ? 'Create (not public)' : 'Save') . '</button>' : '<p class="muted">Read-only.</p>') . '</form>';
}

if ($action === 'new') {
    if (!$canEdit) fail_page(403, 'Read-only account', 'Your account cannot create departures.', $user);
    page('New departure', '<h1>New departure</h1><p class="muted">New departures start as Draft and are never public until you set a maximum capacity and publish. Category D services and inactive tours cannot have departures.</p>' . departure_form($inv, ['departure_type' => 'shared', 'min_group_size' => 3, 'status' => 'draft'], true, true), $user);
}

if ($action === 'edit') {
    $id = isset($_GET['id']) && is_string($_GET['id']) ? $_GET['id'] : '';
    $d = atb_find_departure($deps, $id);
    if (!$d) fail_page(404, 'Not found', 'No departure with that id.', $user);
    $t = $toursBySlug[$d['tour_slug']] ?? ['name' => $d['tour_slug'], 'duration_days' => 0];
    $st = atb_compute_status($d, $today, $settings);
    $b = '<h1>' . h($t['name']) . '</h1><p><strong>' . h(atb_format_range($d['start_date'], $d['end_date'])) . '</strong> · ' . h($d['id']) . ' · customer status: <strong>' . h($st['label']) . '</strong> · ' . (atb_is_public($d, $today) ? 'public' : 'not public') . '</p>';
    if (isset($d['date_check']['ok']) && $d['date_check']['ok'] === false) {
        $b .= '<p class="flash flash--err">Date check: ' . h($d['start_date'] . ' – ' . $d['end_date']) . ' is ' . h(atb_inclusive_days($d['start_date'], $d['end_date'])) . ' days inclusive; the tour is ' . h($t['duration_days']) . ' days. Expected end ' . h(atb_expected_end($d['start_date'], (int)$t['duration_days'])) . '. ' . h($d['date_check']['note'] ?? '') . '</p>';
    }
    if ($canEdit) {
        $ops = ['publish' => 'Publish', 'unpublish' => 'Unpublish', 'approve' => 'Approve operationally', 'unapprove' => 'Withdraw approval', 'close' => 'Close', 'reopen' => 'Reopen', 'cancel' => 'Cancel departure', 'complete' => 'Mark completed'];
        if (isset($d['date_check']['ok']) && $d['date_check']['ok'] === false) $ops['fix_end'] = 'Fix end date to ' . atb_expected_end($d['start_date'], (int)$t['duration_days']);
        $b .= '<div class="card"><strong>Actions</strong><br>';
        foreach ($ops as $op => $label) {
            $b .= '<form class="inline" method="post" action="' . h(url(['a' => 'op'])) . '">' . csrf_field() . '<input type="hidden" name="id" value="' . h($d['id']) . '"><input type="hidden" name="op" value="' . h($op) . '"><button class="' . (in_array($op, ['publish', 'approve'], true) ? '' : 'alt') . '">' . h($label) . '</button></form>';
        }
        $b .= '<p class="muted">Approval: <strong>' . h($d['operational_approval'] ?? 'pending') . '</strong>. Confirmed travelers: <strong>' . h($d['confirmed_count']) . '</strong> of minimum ' . h($d['min_group_size']) . '. Pending: ' . h($d['pending_count']) . '. Remaining capacity: ' . h($d['remaining_capacity'] ?? 'not set') . '.</p></div>';
    }
    $b .= '<h2>Details</h2>' . departure_form($inv, $d, false, $canEdit);
    $travelers = array_filter(atb_load_travelers(), static fn($x) => ($x['departure_id'] ?? '') === $d['id']);
    $b .= '<h2>Bookings on this departure</h2><p class="muted">Staff-only. <strong>Booking status</strong> (per traveler) is separate from the <strong>departure status</strong> above: a booking can be confirmed while the departure is still open and awaiting its minimum. Payment fields are manual notes — no payment is processed or verified here.</p>'
        . '<p class="muted">Departure confirmed on: <strong>' . h($d['confirmed_on'] ?? 'not yet (needs minimum + approval)') . '</strong></p><div class="wrap"><table><thead><tr><th>Name</th><th>Party</th><th>Contact</th><th>Booking status · payment · paid / balance / due</th><th></th></tr></thead><tbody>';
    foreach ($travelers as $tr) {
        $b .= '<tr><td>' . h($tr['name']) . ($tr['inquiry_id'] ? '<br><span class="muted">' . h($tr['inquiry_id']) . '</span>' : '') . '</td><td>' . h($tr['party_size']) . '</td><td>' . h($tr['email']) . '<br>' . h($tr['whatsapp']) . '</td>'
            . '<td>' . ($canEdit ? '<form method="post" action="' . h(url(['a' => 'traveler'])) . '">' . csrf_field() . '<input type="hidden" name="op" value="update"><input type="hidden" name="departure_id" value="' . h($d['id']) . '"><input type="hidden" name="traveler_id" value="' . h($tr['id']) . '"><div class="grid">'
                . '<div>' . select('status', BOOKING_STATUS, (string)$tr['status']) . '</div><div>' . select('payment_status', PAYMENT_NOTE, (string)$tr['payment_status']) . '</div>'
                . '<div><input name="amount_paid" placeholder="Amount paid" value="' . h($tr['amount_paid'] ?? '') . '"></div><div><input name="balance_due" placeholder="Balance" value="' . h($tr['balance_due'] ?? '') . '"></div><div><input type="date" name="balance_due_date" value="' . h($tr['balance_due_date'] ?? '') . '"></div></div><button class="alt">Update</button></form>'
                : h((BOOKING_STATUS[$tr['status']] ?? $tr['status']) . ' · ' . (PAYMENT_NOTE[$tr['payment_status']] ?? $tr['payment_status']))) . '</td>'
            . '<td>' . (($tr['status'] ?? '') === 'confirmed' ? '<a href="' . h(url(['a' => 'confirmation', 'traveler' => $tr['id']])) . '">Booking confirmation</a>' : '') . '</td></tr>';
    }
    if (!$travelers) $b .= '<tr><td colspan="6" class="muted">No travelers assigned.</td></tr>';
    $b .= '</tbody></table></div>';
    if ($canEdit) {
        $b .= '<form class="card" method="post" action="' . h(url(['a' => 'traveler'])) . '">' . csrf_field() . '<input type="hidden" name="op" value="add"><input type="hidden" name="departure_id" value="' . h($d['id']) . '"><strong>Add traveler</strong><div class="grid">'
            . '<div><label for="tn">Name</label><input id="tn" name="name" required></div><div><label for="tp">Party size</label><input id="tp" type="number" min="1" max="50" name="party_size" value="1"></div>'
            . '<div><label for="te">Email</label><input id="te" type="email" name="email"></div><div><label for="tw">WhatsApp</label><input id="tw" name="whatsapp"></div><div><label for="tc">Country</label><input id="tc" name="country"></div>'
            . '<div><label for="status">Booking status</label>' . select('status', ['pending' => BOOKING_STATUS['pending'], 'confirmed' => 'Booking confirmed (committed, paying)'], 'pending') . '</div>'
            . '<div><label for="amount_paid">Amount paid (USD, manual)</label><input id="amount_paid" name="amount_paid"></div><div><label for="balance_due">Balance (USD)</label><input id="balance_due" name="balance_due"></div><div><label for="balance_due_date">Balance due date</label><input type="date" id="balance_due_date" name="balance_due_date"></div>'
            . '<div><label for="payment_status">Payment (manual note)</label>' . select('payment_status', ['not_recorded' => 'Not recorded', 'deposit_recorded' => 'Deposit recorded', 'paid_recorded' => 'Paid recorded'], 'not_recorded') . '</div></div>'
            . '<label for="tnotes">Notes</label><input id="tnotes" name="notes"><button>Add traveler</button></form>';
    }
    page($t['name'] . ' ' . $d['start_date'], $b, $user);
}

if ($action === 'tours') {
    $b = '<h1>Tours &amp; pricing</h1><p class="muted">Reference prices came from the live site on 2026-10-10 and need review. Private tours are always quoted separately. Currency: stored in USD; the site shows “USD” only when that is confirmed in Settings.</p><div class="wrap"><table><thead><tr><th>Tour</th><th>Cat.</th><th>Price</th><th>Private</th><th></th></tr></thead><tbody>';
    foreach ($inv['tours'] as $t) {
        if (($t['category'] ?? '') === 'inactive') continue;
        $p = $t['price'] ?? [];
        $b .= '<tr><td>' . h($t['name']) . '<br><span class="muted">' . h($t['operating_window']['text'] ?? '') . '</span></td><td>' . h($t['category']) . '</td><td colspan="3">';
        if ($canEdit) {
            $b .= '<form class="inline" method="post" action="' . h(url(['a' => 'tour_save'])) . '">' . csrf_field() . '<input type="hidden" name="slug" value="' . h($t['slug']) . '"><div class="grid">'
                . '<div><label>From (USD pp)</label><input name="reference_amount" value="' . h($p['reference_amount'] ?? '') . '"></div><div><label>Status</label>' . select('price_status', ['reference_from_production' => 'Reference (needs review)', 'approved' => 'Approved', 'price_on_request' => 'Price on request'], (string)($p['price_status'] ?? '')) . '</div>'
                . '<div><label><input type="checkbox" name="display_on_site" value="1" style="width:auto"' . (!empty($p['display_on_site']) ? ' checked' : '') . '> Show price</label>'
                . (in_array($t['category'], ['A', 'B', 'C'], true) ? '<label><input type="checkbox" name="private_available" value="1" style="width:auto"' . (!empty($t['private_available']) ? ' checked' : '') . '> Private tours available</label>' : '') . '</div>'
                . (in_array($t['category'], ['A', 'B', 'C'], true) ? '<div><label>Private availability note</label><input name="private_note" value="' . h($t['private_note'] ?? '') . '"></div>' : '')
                . '</div><button class="alt">Save</button></form>';
        } else {
            $b .= h(atb_price_label($p, $settings));
        }
        $b .= '</td></tr>';
    }
    page('Tours & pricing', $b . '</tbody></table></div>', $user);
}

if ($action === 'blackouts') {
    $b = '<h1>Blackout dates</h1><p class="muted">Blocking blackouts stop new departures from being published on those dates for the tours they apply to (use * for all tours). Eid dates are pre-filled as unconfirmed estimates — confirm them once announced.</p><div class="wrap"><table><thead><tr><th>Name</th><th>Dates</th><th>Applies to</th><th>Type</th><th>Confirmed</th><th></th></tr></thead><tbody>';
    foreach ($inv['blackouts'] as $bo) {
        $b .= '<tr><td>' . h($bo['name']) . '<br><span class="muted">' . h($bo['source'] ?? '') . '</span></td><td>' . h($bo['start_date'] . ' → ' . $bo['end_date']) . '</td><td>' . h(implode(', ', $bo['applies_to'] ?? [])) . '</td><td>' . (!empty($bo['blocking']) ? 'blocking' : 'advisory') . '</td><td>' . (!empty($bo['confirmed']) ? 'yes' : '<span class="tag tag--warn">estimate</span>') . '</td><td>';
        if ($canEdit) {
            foreach (empty($bo['confirmed']) ? ['confirm' => 'Confirm', 'delete' => 'Delete'] : ['delete' => 'Delete'] as $op => $l) {
                $b .= '<form class="inline" method="post" action="' . h(url(['a' => 'blackout'])) . '">' . csrf_field() . '<input type="hidden" name="op" value="' . $op . '"><input type="hidden" name="id" value="' . h($bo['id']) . '"><button class="alt">' . $l . '</button></form>';
            }
        }
        $b .= '</td></tr>';
    }
    $b .= '</tbody></table></div>';
    if ($canEdit) {
        $b .= '<form class="card" method="post" action="' . h(url(['a' => 'blackout'])) . '">' . csrf_field() . '<input type="hidden" name="op" value="add"><strong>Add blackout</strong><div class="grid"><div><label>Name</label><input name="name" required></div><div><label>Start</label><input type="date" name="start_date" required></div><div><label>End</label><input type="date" name="end_date" required></div><div><label>Applies to (tour slugs, comma separated, or *)</label><input name="applies_to" value="weekend-in-kabul"></div></div>'
            . '<label><input type="checkbox" name="blocking" value="1" checked style="width:auto"> Blocking</label><label><input type="checkbox" name="confirmed" value="1" style="width:auto"> Confirmed</label><button>Add</button></form>';
    }
    page('Blackout dates', $b, $user);
}

if ($action === 'settings') {
    $chk = static fn(string $k) => !empty($settings[$k]) ? ' checked' : '';
    $b = '<h1>Settings</h1><form class="card" method="post" action="' . h(url(['a' => 'settings_save'])) . '">' . csrf_field()
        . '<label><input type="checkbox" name="usd_confirmed" value="1" style="width:auto"' . $chk('usd_confirmed') . '> Dollar prices are confirmed as USD (shows “USD” instead of “$”)</label>'
        . '<label><input type="checkbox" name="show_public_capacity" value="1" style="width:auto"' . $chk('show_public_capacity') . '> Show maximum capacity / remaining places publicly (only where capacity is set)</label>'
        . '<label><input type="checkbox" name="show_public_confirmed_counts" value="1" style="width:auto"' . $chk('show_public_confirmed_counts') . '> Allow “x of 3 travelers confirmed” (each departure must also opt in)</label>'
        . '<label>“Limited places” when this many or fewer remain</label><input type="number" min="1" max="10" name="limited_places_threshold" value="' . h($settings['limited_places_threshold'] ?? 2) . '" style="max-width:120px">'
        . ($canEdit ? '<button>Save settings</button>' : '') . '</form><p class="muted">Seed imported ' . h($inv['seed']['imported_at'] ?? '') . ' (seed as of ' . h($inv['seed']['seed_as_of'] ?? '') . '). Contact shown on the site: ' . h(($settings['contact']['email'] ?? '') . ' · ' . ($settings['contact']['whatsapp_display'] ?? '')) . '.</p>';
    page('Settings', $b, $user);
}

if ($action === 'inquiries') {
    $rows = atb_load_inquiries();
    $b = '<h1>Inquiries</h1><p class="muted">Every website request is stored here as well as emailed to info@afghantours.com. Newest first.</p><div class="wrap"><table><thead><tr><th>Received (UTC)</th><th>Name</th><th>Tour / departure</th><th>Travelers</th><th>Type</th><th>Status</th></tr></thead><tbody>';
    foreach ($rows as $r) {
        $b .= '<tr><td><a href="' . h(url(['a' => 'inquiry', 'id' => $r['id']])) . '">' . h($r['received_at']) . '</a></td><td>' . h($r['name'] ?? '') . '</td><td>' . h($r['entity_name'] ?? '') . '<br><span class="muted">' . h($r['departure_id'] ?? '') . '</span></td><td>' . h($r['travelers'] ?? '') . '</td><td>' . h($r['booking_type'] ?? '') . '</td><td>' . h($r['status'] ?? 'new') . '</td></tr>';
    }
    if (!$rows) $b .= '<tr><td colspan="6" class="muted">No inquiries stored yet.</td></tr>';
    page('Inquiries', $b . '</tbody></table></div>', $user);
}

if ($action === 'inquiry') {
    $id = isset($_GET['id']) && is_string($_GET['id']) ? $_GET['id'] : '';
    $r = null;
    foreach (atb_load_inquiries() as $x) if ($x['id'] === $id) $r = $x;
    if (!$r) fail_page(404, 'Not found', 'No inquiry with that id.', $user);
    $b = '<h1>Inquiry ' . h($r['id']) . '</h1><div class="card"><table>';
    foreach ($r as $k => $v) {
        if (is_array($v)) $v = json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $b .= '<tr><th style="width:200px">' . h($k) . '</th><td>' . nl2br(h($v)) . '</td></tr>';
    }
    $b .= '</table></div>';
    if ($canEdit) {
        $b .= '<form class="card" method="post" action="' . h(url(['a' => 'inquiry'])) . '">' . csrf_field() . '<input type="hidden" name="id" value="' . h($r['id']) . '"><input type="hidden" name="op" value="status"><label for="status">Status</label>' . select('status', ['new' => 'New', 'contacted' => 'Contacted', 'approved' => 'Booking approved', 'declined' => 'Declined', 'closed' => 'Closed'], (string)($r['status'] ?? 'new')) . '<button class="alt">Update status</button></form>';
        $opts = ['' => 'Choose a departure'];
        foreach ($deps as $d) {
            if ($d['end_date'] < $today || in_array($d['status'], ['completed', 'cancelled'], true)) continue;
            $opts[$d['id']] = ($toursBySlug[$d['tour_slug']]['name'] ?? $d['tour_slug']) . ' · ' . $d['start_date'] . ' (' . $d['status'] . ')';
        }
        $b .= '<form class="card" method="post" action="' . h(url(['a' => 'inquiry'])) . '">' . csrf_field() . '<input type="hidden" name="id" value="' . h($r['id']) . '"><input type="hidden" name="op" value="assign"><label for="departure_id">Assign to departure (adds a pending traveler)</label>' . select('departure_id', $opts, (string)($r['departure_id'] ?? '')) . '<button>Assign</button></form>';
    }
    page('Inquiry', $b, $user);
}

if ($action === 'confirmation') {
    $tid = isset($_GET['traveler']) && is_string($_GET['traveler']) ? $_GET['traveler'] : '';
    $tr = null;
    foreach (atb_load_travelers() as $x) if (($x['id'] ?? '') === $tid) $tr = $x;
    if (!$tr) fail_page(404, 'Not found', 'Booking not found.', $user);
    $d = atb_find_departure($deps, (string)$tr['departure_id']);
    $t = $d ? ($toursBySlug[$d['tour_slug']] ?? null) : null;
    $page = booking_confirmation_text($tr, $d, $t, $today, $settings);
    $b = '<h1>Booking confirmation</h1><p class="muted">Generated from the booking and departure records. Nothing is sent from here — copy the text into your email to the traveler after checking it. ' . ($tr['status'] !== 'confirmed' ? '<strong>This booking is not confirmed yet.</strong>' : '') . '</p>'
        . '<div class="card"><table>' ;
    foreach ($page['fields'] as $k => $v) $b .= '<tr><th>' . h($k) . '</th><td>' . h($v) . '</td></tr>';
    $b .= '</table></div><h2>Email text</h2><textarea style="min-height:420px" readonly>' . h($page['email']) . '</textarea>';
    page('Booking confirmation', $b, $user);
}

fail_page(404, 'Not found', 'Unknown page.', $user);
