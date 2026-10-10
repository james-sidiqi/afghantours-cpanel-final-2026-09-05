<?php
declare(strict_types=1);

/**
 * AfghanTours booking inventory — PHP runtime (PHP 8.1+, no extensions beyond json/session).
 *
 * Storage: flat JSON files in the PRIVATE folder (outside the docroot), written atomically
 * (temp file + rename) under an exclusive flock. Works on any shared cPanel host.
 *
 *   <private>/booking/inventory.json   catalog + departures + blackouts + settings (authoritative after first import)
 *   <private>/booking/travelers.json   traveler assignments (PII — never public)
 *   <private>/booking/inquiries.jsonl  one JSON object per website inquiry (PII — never public)
 *   <private>/booking/audit.log        JSON lines: who changed what
 *   <private>/booking-config.php       admin users (password_hash), settings overrides
 *
 * <private> defaults to <docroot>/../afghantours-private  (= /home/jamesbon/afghantours-private on live),
 * the same folder PR #17 (HesabPay) uses. Override with env AFGHANTOURS_PRIVATE_DIR.
 *
 * Status rules mirror src/lib/booking/core.mjs (fixtures: scripts/booking-test/fixtures.json).
 */

if (!defined('ATB_LIB')) {
    define('ATB_LIB', 1);
}

const ATB_SCHEMA = 1;
const ATB_STORED_STATUSES = ['proposed', 'draft', 'scheduled', 'on_request', 'closed', 'cancelled', 'completed'];
const ATB_SELECTABLE = ['available_awaiting_minimum', 'confirmed', 'limited', 'on_request'];
const ATB_STATUS_LABELS = [
    'available_awaiting_minimum' => 'Available — Awaiting Minimum',
    'confirmed' => 'Confirmed Departure',
    'limited' => 'Limited Places',
    'sold_out' => 'Sold Out',
    'on_request' => 'On Request',
    'closed' => 'Closed',
    'cancelled' => 'Cancelled',
    'completed' => 'Completed',
    'proposed' => 'Proposed (not public)',
];

/* ------------------------------------------------------------------ paths */

function atb_private_dir(): string {
    $env = getenv('AFGHANTOURS_PRIVATE_DIR');
    if (is_string($env) && $env !== '') {
        return rtrim($env, '/\\');
    }
    // <docroot>/booking/lib/booking.php → dirname(__DIR__, 3) = parent of docroot.
    return dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . 'afghantours-private';
}

function atb_data_dir(): string {
    return atb_private_dir() . DIRECTORY_SEPARATOR . 'booking';
}

function atb_seed_dir(): ?string {
    $env = getenv('AFGHANTOURS_BOOKING_SEED_DIR');
    $candidates = [];
    if (is_string($env) && $env !== '') {
        $candidates[] = $env;
    }
    $candidates[] = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'seed';               // dist/booking/seed (copied at build)
    $candidates[] = dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'booking'; // repo layout (public/ or dist/)
    foreach ($candidates as $dir) {
        if (is_file($dir . DIRECTORY_SEPARATOR . 'departures.json')) {
            return $dir;
        }
    }
    return null;
}

/* ------------------------------------------------------------- utilities */

function atb_today(?string $tz = null): string {
    $override = getenv('BOOKING_TODAY');
    if (is_string($override) && atb_is_iso_date($override)) {
        return $override;
    }
    $zone = new DateTimeZone($tz ?: 'Asia/Kabul');
    return (new DateTimeImmutable('now', $zone))->format('Y-m-d');
}

function atb_now_iso(): string {
    return (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s\Z');
}

function atb_is_iso_date(mixed $value): bool {
    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
        return false;
    }
    [$y, $m, $d] = array_map('intval', explode('-', $value));
    return checkdate($m, $d, $y);
}

function atb_add_days(string $iso, int $days): string {
    $d = new DateTimeImmutable($iso . 'T00:00:00', new DateTimeZone('UTC'));
    return $d->modify(($days >= 0 ? '+' : '') . $days . ' days')->format('Y-m-d');
}

function atb_expected_end(string $start, int $durationDays): string {
    return atb_add_days($start, $durationDays - 1);
}

function atb_inclusive_days(string $start, string $end): int {
    $a = new DateTimeImmutable($start . 'T00:00:00', new DateTimeZone('UTC'));
    $b = new DateTimeImmutable($end . 'T00:00:00', new DateTimeZone('UTC'));
    return (int)round(($b->getTimestamp() - $a->getTimestamp()) / 86400) + 1;
}

function atb_weekday(string $iso): int {
    return (int)(new DateTimeImmutable($iso . 'T00:00:00', new DateTimeZone('UTC')))->format('w'); // 0 Sun … 6 Sat
}

function atb_int(mixed $v, ?int $fallback = null): ?int {
    if ($v === null || $v === '' || is_bool($v)) {
        return $fallback;
    }
    if (is_int($v)) {
        return $v;
    }
    if (is_numeric($v)) {
        return (int)$v;
    }
    return $fallback;
}

function atb_str(mixed $v, int $max = 500): string {
    $s = is_scalar($v) ? (string)$v : '';
    $s = str_replace("\0", '', $s);
    $s = trim($s);
    if (function_exists('mb_substr')) {
        return mb_substr($s, 0, $max);
    }
    return substr($s, 0, $max);
}

/* ---------------------------------------------------------- status rules */

/** @return array{key:string,label:string,selectable:bool,remaining:?int} */
function atb_compute_status(array $dep, string $today, array $settings = []): array {
    $stored = strtolower((string)($dep['status'] ?? ''));
    $min = atb_int($dep['min_group_size'] ?? null, atb_int($settings['shared_min_group_default'] ?? null, 3));
    $cap = atb_int($dep['max_capacity'] ?? null, null);
    $confirmed = max(0, (int)atb_int($dep['confirmed_count'] ?? 0, 0));
    $threshold = (int)atb_int($settings['limited_places_threshold'] ?? null, 2);
    $remaining = $cap === null ? null : max($cap - $confirmed, 0);
    $out = static fn(string $k): array => [
        'key' => $k,
        'label' => ATB_STATUS_LABELS[$k],
        'selectable' => in_array($k, ATB_SELECTABLE, true),
        'remaining' => $remaining,
    ];
    $start = (string)($dep['start_date'] ?? '');
    $end = (string)($dep['end_date'] ?? '');

    if ($stored === 'proposed' || $stored === 'draft') return $out('proposed');
    if (!atb_is_iso_date($start) || !atb_is_iso_date($end)) return $out('closed');
    if ($end < $today || $stored === 'completed') return $out('completed');
    if ($stored === 'cancelled') return $out('cancelled');
    if ($stored === 'closed') return $out('closed');
    if ($start <= $today) return $out('closed');
    $cutoff = $dep['booking_cutoff'] ?? null;
    if (is_string($cutoff) && atb_is_iso_date($cutoff) && $today > $cutoff) return $out('closed');
    if (($dep['departure_type'] ?? 'shared') === 'private' || $stored === 'on_request') return $out('on_request');
    if ($remaining === 0) return $out('sold_out');
    if ($confirmed >= $min && ($dep['operational_approval'] ?? '') === 'approved') {
        if ($remaining !== null && $remaining <= $threshold) return $out('limited');
        return $out('confirmed');
    }
    return $out('available_awaiting_minimum');
}

function atb_is_public(array $dep, string $today): bool {
    $stored = strtolower((string)($dep['status'] ?? ''));
    if (($dep['published'] ?? false) !== true) return false;
    if ($stored === 'proposed' || $stored === 'draft') return false;
    $end = (string)($dep['end_date'] ?? '');
    return atb_is_iso_date($end) && $end >= $today;
}

function atb_group_minimum_note(mixed $travelers, string $type, int $min = 3): string {
    $n = (int)atb_int($travelers, 0);
    if ($type === 'private') return 'private';
    if ($n <= 0) return 'unknown';
    return $n >= $min ? 'meets_minimum' : 'below_minimum';
}

function atb_price_label(?array $price, array $settings = []): string {
    $amount = $price['amount'] ?? ($price['reference_amount'] ?? null);
    $status = (string)($price['price_status'] ?? '');
    if (!is_numeric($amount) || (float)$amount <= 0 || $status === 'price_on_request' || ($price['display_on_site'] ?? true) === false) {
        return 'Price on request';
    }
    $num = number_format((float)$amount, 0, '.', ',');
    return 'From ' . (!empty($settings['usd_confirmed']) ? 'USD ' . $num : '$' . $num) . ' per person';
}

function atb_format_range(string $start, string $end): string {
    $a = new DateTimeImmutable($start . 'T00:00:00', new DateTimeZone('UTC'));
    $b = new DateTimeImmutable($end . 'T00:00:00', new DateTimeZone('UTC'));
    $left = $a->format('D j M') . ($a->format('Y') !== $b->format('Y') ? ' ' . $a->format('Y') : '');
    return $left . ' – ' . $b->format('D j M Y');
}

function atb_status_text(string $key, array $dep, array $settings = []): string {
    $min = (int)atb_int($dep['min_group_size'] ?? 3, 3);
    if ($key === 'available_awaiting_minimum') {
        $w = (string)($settings['wording']['awaiting_minimum'] ?? 'Awaiting group confirmation — minimum 3 travelers.');
        return (string)preg_replace('/minimum \d+/', 'minimum ' . $min, $w);
    }
    if ($key === 'on_request') return 'On request — private departure';
    return ATB_STATUS_LABELS[$key] ?? 'Ask us';
}

function atb_cta(string $key): string {
    return match ($key) {
        'available_awaiting_minimum' => 'Request a Place',
        'confirmed', 'limited' => 'Join This Departure',
        'on_request' => 'Request Private Tour',
        default => 'Ask About Dates',
    };
}

/** Whitelisted public projection — never traveler data, internal notes or approval metadata. */
function atb_public_departure(array $dep, ?array $tour, array $settings, string $today): array {
    $st = atb_compute_status($dep, $today, $settings);
    $out = [
        'id' => (string)$dep['id'],
        'tour_slug' => (string)($dep['tour_slug'] ?? ''),
        'tour_code' => (string)($dep['tour_code'] ?? ''),
        'start_date' => (string)$dep['start_date'],
        'end_date' => (string)$dep['end_date'],
        'duration_days' => (int)($dep['duration_days'] ?? 0),
        'date_label' => atb_format_range((string)$dep['start_date'], (string)$dep['end_date']),
        'departure_type' => ($dep['departure_type'] ?? '') === 'private' ? 'private' : 'shared',
        'min_group_size' => (int)atb_int($dep['min_group_size'] ?? 3, 3),
        'status' => $st['key'],
        'status_label' => $st['label'],
        'status_text' => atb_status_text($st['key'], $dep, $settings),
        'selectable' => $st['selectable'],
        'cta' => atb_cta($st['key']),
        'price_label' => atb_price_label(is_array($dep['price'] ?? null) ? $dep['price'] : ($tour['price'] ?? null), $settings),
        'arrival_option' => $dep['arrival_option'] ?? null,
        'public_notes' => atb_str($dep['public_notes'] ?? '', 300),
    ];
    $cap = atb_int($dep['max_capacity'] ?? null, null);
    if (!empty($settings['show_public_capacity']) && $cap !== null) {
        $out['max_capacity'] = $cap;
        if (in_array($st['key'], ['confirmed', 'limited', 'sold_out'], true)) {
            $out['remaining_places'] = $st['remaining'];
        }
    }
    if (!empty($settings['show_public_confirmed_counts']) && ($dep['public_counts_approved'] ?? false) === true && $out['departure_type'] === 'shared') {
        $out['confirmed_text'] = max(0, (int)atb_int($dep['confirmed_count'] ?? 0, 0)) . ' of ' . $out['min_group_size'] . ' travelers confirmed.';
    }
    return $out;
}

/* --------------------------------------------------------------- storage */

function atb_store_available(): bool {
    $dir = atb_data_dir();
    if (!is_dir($dir)) {
        $parent = atb_private_dir();
        if (!is_dir($parent) || !is_writable($parent)) {
            return false;
        }
        if (!@mkdir($dir, 0700, true) && !is_dir($dir)) {
            return false;
        }
    }
    return is_writable($dir);
}

/** Run $fn while holding an exclusive lock on the data dir. */
function atb_with_lock(callable $fn): mixed {
    $lockPath = atb_data_dir() . DIRECTORY_SEPARATOR . '.lock';
    $h = @fopen($lockPath, 'c');
    if ($h === false) {
        throw new RuntimeException('Cannot open lock file');
    }
    try {
        if (!flock($h, LOCK_EX)) {
            throw new RuntimeException('Cannot lock booking store');
        }
        return $fn();
    } finally {
        @flock($h, LOCK_UN);
        @fclose($h);
    }
}

function atb_read_json_file(string $path): ?array {
    if (!is_file($path)) {
        return null;
    }
    $raw = @file_get_contents($path);
    if ($raw === false || $raw === '') {
        return null;
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

function atb_write_json_atomic(string $path, array $data): void {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        throw new RuntimeException('JSON encode failed');
    }
    $tmp = $path . '.tmp-' . bin2hex(random_bytes(6));
    if (@file_put_contents($tmp, $json . "\n", LOCK_EX) === false) {
        throw new RuntimeException('Write failed');
    }
    @chmod($tmp, 0600);
    if (!@rename($tmp, $path)) {
        @unlink($tmp);
        throw new RuntimeException('Atomic rename failed');
    }
}

function atb_append_jsonl(string $path, array $row): bool {
    $line = json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($line === false) {
        return false;
    }
    $new = !is_file($path);
    $ok = @file_put_contents($path, $line . "\n", FILE_APPEND | LOCK_EX) !== false;
    if ($ok && $new) {
        @chmod($path, 0600);
    }
    return $ok;
}

function atb_load_seed(): ?array {
    $dir = atb_seed_dir();
    if ($dir === null) {
        return null;
    }
    $cat = atb_read_json_file($dir . '/tours-catalog.json');
    $dep = atb_read_json_file($dir . '/departures.json');
    $bo = atb_read_json_file($dir . '/blackouts.json');
    $set = atb_read_json_file($dir . '/settings.json');
    if (!$cat || !$dep || !$bo || !$set) {
        return null;
    }
    unset($set['_doc']);
    return [
        'schema' => ATB_SCHEMA,
        'revision' => 1,
        'seed' => ['seed_as_of' => $set['seed_as_of'] ?? null, 'imported_at' => atb_now_iso()],
        'categories' => $cat['categories'] ?? [],
        'tours' => $cat['tours'] ?? [],
        'departures' => $dep['departures'] ?? [],
        'blackouts' => $bo['blackouts'] ?? [],
        'settings' => $set,
        'updated_at' => atb_now_iso(),
    ];
}

/**
 * Load the authoritative inventory. First run imports the seed into the private store.
 * Returns [inventory, source] where source is 'private_store' | 'seed_readonly' | 'unavailable'.
 */
function atb_load_inventory(): array {
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    $path = atb_data_dir() . DIRECTORY_SEPARATOR . 'inventory.json';
    if (atb_store_available()) {
        $inv = atb_read_json_file($path);
        if ($inv === null) {
            $inv = atb_with_lock(static function () use ($path) {
                $existing = atb_read_json_file($path);
                if ($existing !== null) {
                    return $existing;
                }
                $seed = atb_load_seed();
                if ($seed === null) {
                    return null;
                }
                atb_write_json_atomic($path, $seed);
                atb_audit('system', 'import_seed', ['seed_as_of' => $seed['seed']['seed_as_of'] ?? null, 'departures' => count($seed['departures'])]);
                return $seed;
            });
        }
        if (is_array($inv)) {
            return $cache = [$inv, 'private_store'];
        }
    }
    $seed = atb_load_seed();
    if ($seed !== null) {
        return $cache = [$seed, 'seed_readonly'];
    }
    return $cache = [['tours' => [], 'departures' => [], 'blackouts' => [], 'settings' => [], 'categories' => []], 'unavailable'];
}

function atb_reset_cache(): void {
    // Only used by tests (each HTTP request is a fresh process in production).
}

function atb_save_inventory(array $inv, string $actor, string $action, array $detail = []): array {
    $path = atb_data_dir() . DIRECTORY_SEPARATOR . 'inventory.json';
    return atb_with_lock(static function () use ($path, $inv, $actor, $action, $detail) {
        $current = atb_read_json_file($path);
        $expected = (int)($inv['revision'] ?? 0);
        if ($current !== null && (int)($current['revision'] ?? 0) !== $expected) {
            throw new RuntimeException('The inventory changed since you opened this page. Reload and try again.');
        }
        $inv['revision'] = $expected + 1;
        $inv['updated_at'] = atb_now_iso();
        atb_write_json_atomic($path, $inv);
        atb_audit($actor, $action, $detail);
        return $inv;
    });
}

function atb_load_travelers(): array {
    $data = atb_read_json_file(atb_data_dir() . DIRECTORY_SEPARATOR . 'travelers.json');
    return is_array($data['travelers'] ?? null) ? $data['travelers'] : [];
}

function atb_save_travelers(array $travelers, string $actor, string $action, array $detail = []): void {
    $path = atb_data_dir() . DIRECTORY_SEPARATOR . 'travelers.json';
    atb_with_lock(static function () use ($path, $travelers, $actor, $action, $detail) {
        atb_write_json_atomic($path, ['schema' => ATB_SCHEMA, 'updated_at' => atb_now_iso(), 'travelers' => array_values($travelers)]);
        atb_audit($actor, $action, $detail);
        return null;
    });
}

function atb_audit(string $actor, string $action, array $detail = []): void {
    atb_append_jsonl(atb_data_dir() . DIRECTORY_SEPARATOR . 'audit.log', [
        'at' => atb_now_iso(), 'actor' => $actor, 'action' => $action, 'detail' => $detail,
    ]);
}

/** Confirmed / pending traveler counts per departure (only confirmed counts toward the minimum). */
function atb_counts(array $travelers): array {
    $out = [];
    foreach ($travelers as $t) {
        $id = (string)($t['departure_id'] ?? '');
        if ($id === '') continue;
        $n = max(1, (int)atb_int($t['party_size'] ?? 1, 1));
        $out[$id] ??= ['confirmed' => 0, 'pending' => 0];
        if (($t['status'] ?? '') === 'confirmed') $out[$id]['confirmed'] += $n;
        elseif (($t['status'] ?? '') === 'pending') $out[$id]['pending'] += $n;
    }
    return $out;
}

/** Departures with counts taken from the traveler file (falls back to stored counts when absent). */
function atb_effective_departures(array $inv): array {
    $travelersFile = atb_data_dir() . DIRECTORY_SEPARATOR . 'travelers.json';
    $useTravelers = is_file($travelersFile);
    $counts = $useTravelers ? atb_counts(atb_load_travelers()) : [];
    $out = [];
    foreach ($inv['departures'] ?? [] as $d) {
        if ($useTravelers) {
            $c = $counts[$d['id']] ?? ['confirmed' => 0, 'pending' => 0];
            $d['confirmed_count'] = $c['confirmed'];
            $d['pending_count'] = $c['pending'];
        }
        $cap = atb_int($d['max_capacity'] ?? null, null);
        $d['remaining_capacity'] = $cap === null ? null : max($cap - (int)($d['confirmed_count'] ?? 0), 0);
        $out[] = $d;
    }
    return $out;
}

function atb_tour(array $inv, string $slug): ?array {
    foreach ($inv['tours'] ?? [] as $t) {
        if (($t['slug'] ?? '') === $slug) return $t;
    }
    return null;
}

function atb_find_departure(array $deps, string $id): ?array {
    foreach ($deps as $d) {
        if (($d['id'] ?? '') === $id) return $d;
    }
    return null;
}

/** Public list for the read endpoint. */
function atb_public_payload(?string $tourSlug = null): array {
    [$inv, $source] = atb_load_inventory();
    $settings = $inv['settings'] ?? [];
    $today = atb_today($settings['timezone'] ?? 'Asia/Kabul');
    $deps = atb_effective_departures($inv);
    $list = [];
    foreach ($deps as $d) {
        if ($tourSlug !== null && $tourSlug !== '' && ($d['tour_slug'] ?? '') !== $tourSlug) continue;
        if (!atb_is_public($d, $today)) continue;
        $t = atb_tour($inv, (string)$d['tour_slug']);
        if ($t === null || ($t['active'] ?? true) === false || !in_array($t['category'] ?? '', ['A', 'B', 'C'], true)) continue;
        $list[] = atb_public_departure($d, $t, $settings, $today);
    }
    usort($list, static fn($a, $b) => strcmp($a['start_date'], $b['start_date']));
    return [
        'ok' => $source !== 'unavailable',
        'today' => $today,
        'source' => $source === 'private_store' ? 'live' : ($source === 'seed_readonly' ? 'seed' : 'unavailable'),
        'usd_confirmed' => !empty($settings['usd_confirmed']),
        'departures' => $list,
    ];
}

/** Blackouts overlapping a range for a tour. */
function atb_blackouts_for(array $inv, string $slug, string $start, string $end, bool $blockingOnly = true): array {
    $hits = [];
    foreach ($inv['blackouts'] ?? [] as $b) {
        if ($blockingOnly && empty($b['blocking'])) continue;
        $applies = $b['applies_to'] ?? [];
        if (!in_array('*', $applies, true) && !in_array($slug, $applies, true)) continue;
        if ($start <= ($b['end_date'] ?? '') && $end >= ($b['start_date'] ?? '')) $hits[] = $b;
    }
    return $hits;
}

/** Validate a departure for creation/editing. Returns list of error strings. */
function atb_validate_departure(array $dep, array $inv, string $today, bool $forPublish): array {
    $errors = [];
    $t = atb_tour($inv, (string)($dep['tour_slug'] ?? ''));
    if ($t === null || !in_array($t['category'] ?? '', ['A', 'B', 'C'], true) || ($t['active'] ?? true) === false) {
        $errors[] = 'Departures can only be created for active tours in categories A, B or C.';
        return $errors;
    }
    $start = (string)($dep['start_date'] ?? '');
    $end = (string)($dep['end_date'] ?? '');
    if (!atb_is_iso_date($start) || !atb_is_iso_date($end)) {
        $errors[] = 'Start and end dates must be valid dates (YYYY-MM-DD).';
        return $errors;
    }
    if ($end < $start) $errors[] = 'End date is before start date.';
    $days = (int)$t['duration_days'];
    if (atb_inclusive_days($start, $end) !== $days && empty($dep['date_check_override'])) {
        $errors[] = sprintf('%s – %s is %d days inclusive; %s is %d days (end should be %s).', $start, $end, atb_inclusive_days($start, $end), $t['name'], $days, atb_expected_end($start, $days));
    }
    if (!in_array($dep['status'] ?? '', ATB_STORED_STATUSES, true)) $errors[] = 'Unknown status.';
    if (!in_array($dep['departure_type'] ?? '', ['shared', 'private'], true)) $errors[] = 'Type must be shared or private.';
    $min = atb_int($dep['min_group_size'] ?? null, null);
    if ($min === null || $min < 1) $errors[] = 'Minimum group size must be at least 1.';
    if (($dep['departure_type'] ?? '') === 'shared' && $min !== null && $min < 3) $errors[] = 'Shared group departures need a minimum of 3 travelers (policy).';
    $cap = $dep['max_capacity'] ?? null;
    if ($cap !== null && (!is_int($cap) || ($min !== null && $cap < $min))) $errors[] = 'Maximum capacity must be a whole number at least the minimum.';
    $cut = $dep['booking_cutoff'] ?? null;
    if ($cut !== null && (!atb_is_iso_date($cut) || $cut > $start)) $errors[] = 'Booking cutoff must be a date on or before the start date.';
    if ($forPublish) {
        if ($cap === null) $errors[] = 'Set a maximum capacity before publishing.';
        if ($start <= $today) $errors[] = 'Only future departures can be published.';
        if (in_array($dep['status'] ?? '', ['proposed', 'draft', 'cancelled', 'completed'], true)) $errors[] = 'Change the status to Scheduled (or On request) before publishing.';
        foreach (atb_blackouts_for($inv, (string)$dep['tour_slug'], $start, $end) as $b) {
            if (!empty($b['confirmed'])) $errors[] = 'Overlaps confirmed blackout: ' . ($b['name'] ?? $b['id']) . '.';
        }
    }
    return $errors;
}

function atb_new_departure_id(array $deps, string $code, string $start, string $type): string {
    $base = 'DEP-' . preg_replace('/[^A-Z0-9-]/', '', strtoupper($code)) . '-' . str_replace('-', '', $start) . ($type === 'private' ? '-P' : '');
    $ids = array_column($deps, 'id');
    $id = $base;
    $n = 2;
    while (in_array($id, $ids, true)) {
        $id = $base . '-' . $n++;
    }
    return $id;
}

/* ------------------------------------------------------------- config */

function atb_config_path(): string {
    $env = getenv('AFGHANTOURS_BOOKING_CONFIG');
    if (is_string($env) && $env !== '') return $env;
    return atb_private_dir() . DIRECTORY_SEPARATOR . 'booking-config.php';
}

function atb_config(): array {
    static $cfg = null;
    if ($cfg !== null) return $cfg;
    $cfg = ['admin_users' => [], 'session_idle_minutes' => 30, 'session_max_hours' => 8, 'login_max_attempts' => 5, 'login_window_minutes' => 15, 'notify_email' => 'info@afghantours.com'];
    $path = atb_config_path();
    if (is_file($path) && is_readable($path)) {
        $loaded = (static function (string $p) { return include $p; })($path);
        if (is_array($loaded)) $cfg = array_replace($cfg, $loaded);
    }
    return $cfg;
}

/* ------------------------------------------------------------- inquiries */

function atb_store_inquiry(array $record): ?string {
    if (!atb_store_available()) return null;
    $id = 'INQ-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3));
    $record = ['id' => $id, 'received_at' => atb_now_iso(), 'status' => 'new'] + $record;
    return atb_append_jsonl(atb_data_dir() . DIRECTORY_SEPARATOR . 'inquiries.jsonl', $record) ? $id : null;
}

function atb_load_inquiries(): array {
    $path = atb_data_dir() . DIRECTORY_SEPARATOR . 'inquiries.jsonl';
    if (!is_file($path)) return [];
    $rows = [];
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $r = json_decode($line, true);
        if (is_array($r) && isset($r['id'])) $rows[$r['id']] = $r;
    }
    // Status updates are stored in a side file (append-only inquiries log stays untouched).
    $meta = atb_read_json_file(atb_data_dir() . DIRECTORY_SEPARATOR . 'inquiry-status.json') ?? [];
    foreach ($meta as $id => $m) {
        if (isset($rows[$id]) && is_array($m)) $rows[$id] = array_replace($rows[$id], $m);
    }
    $rows = array_values($rows);
    usort($rows, static fn($a, $b) => strcmp((string)$b['received_at'], (string)$a['received_at']));
    return $rows;
}

function atb_update_inquiry(string $id, array $changes, string $actor): void {
    $path = atb_data_dir() . DIRECTORY_SEPARATOR . 'inquiry-status.json';
    atb_with_lock(static function () use ($path, $id, $changes, $actor) {
        $meta = atb_read_json_file($path) ?? [];
        $meta[$id] = array_replace($meta[$id] ?? [], $changes, ['updated_at' => atb_now_iso(), 'updated_by' => $actor]);
        atb_write_json_atomic($path, $meta);
        atb_audit($actor, 'inquiry_update', ['id' => $id] + $changes);
        return null;
    });
}
