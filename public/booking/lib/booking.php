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
const ATB_SELECTABLE = ['open', 'confirmed', 'limited'];
// Public vocabulary (spec 10 Oct 2026 Part 1 §4): open, confirmed, limited, sold_out, closed. The rest are internal.
const ATB_STATUS_LABELS = [
    'open' => 'Open',
    'confirmed' => 'Confirmed',
    'limited' => 'Limited',
    'sold_out' => 'Sold out',
    'closed' => 'Closed',
    'on_request' => 'Private — on request',
    'cancelled' => 'Cancelled',
    'completed' => 'Completed (past)',
    'proposed' => 'Proposed (not public)',
    'review' => 'Minimum-group review (not public)',
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

const ATB_LAST_MINUTE_CTA = 'Contact us for last-minute availability';

function atb_days_between(string $from, string $to): int {
    $a = new DateTimeImmutable($from . 'T00:00:00', new DateTimeZone('UTC'));
    $b = new DateTimeImmutable($to . 'T00:00:00', new DateTimeZone('UTC'));
    return (int)round(($b->getTimestamp() - $a->getTimestamp()) / 86400);
}

/** Traveler-count provenance (owner correction 19:01): unknown ≠ zero. Mirrors countStatus(). */
function atb_count_status(array $dep): string {
    $s = $dep['traveler_count_status'] ?? null;
    if ($s === 'unknown' || $s === 'verified') return $s;
    return (!array_key_exists('confirmed_count', $dep) || $dep['confirmed_count'] === null) ? 'unknown' : 'verified';
}
const ATB_CONTACT_CTA = 'Contact us for availability';
const ATB_MANUAL_CONTACT_TEXT = 'Availability on request';

/** Listed on the site — mirrors isListed() in core.mjs. */
function atb_is_listed(array $dep, string $today, array $settings = []): bool {
    if (!atb_is_public($dep, $today)) return false;
    if (atb_eid_unresolved($dep, (array)($settings['religious_calendar'] ?? []))) return false;
    return atb_compute_status($dep, $today, $settings)['key'] !== 'review';
}

/** Approved minimum-group exception (decision B): note + pricing review + operational approval + price re-approved. */
function atb_exception_approved(array $dep): bool {
    $x = $dep['min_group_exception'] ?? null;
    return is_array($x) && ($x['approved'] ?? false) === true && trim((string)($x['note'] ?? '')) !== '' && ($x['pricing_review_ack'] ?? false) === true && !empty($x['by'])
        && ($dep['operational_approval'] ?? '') === 'approved' && ($dep['price_approved'] ?? null) === true;
}

/** Long-tour (5+ day shared) review / cutoff window — mirrors longTourWindow() in core.mjs. */
function atb_long_tour_window(array $dep, string $today, array $settings = []): array {
    $longDays = (int)atb_int($settings['group_rule']['long_tour_min_days'] ?? null, 5);
    $start = (string)($dep['start_date'] ?? '');
    $end = (string)($dep['end_date'] ?? '');
    $duration = atb_int($dep['duration_days'] ?? null, null) ?? ((atb_is_iso_date($start) && atb_is_iso_date($end)) ? atb_inclusive_days($start, $end) : 0);
    $isLong = $duration >= $longDays;
    // Short (≤4-day) shared departures: same review pattern at short_tour_min_group_review_days (14), no final booking cutoff.
    $shortReview = atb_int($settings['short_tour_min_group_review_days'] ?? null, null);
    $applies = ($dep['departure_type'] ?? 'shared') !== 'private' && atb_is_iso_date($start) && $duration > 0 && ($isLong || $shortReview !== null);
    if (!$applies) return ['applies' => false, 'state' => 'none', 'booking_window_closed' => false];
    if (!$isLong) return atb_review_window($dep, $today, 'short', (int)$shortReview, null);
    return atb_review_window($dep, $today, 'long', (int)atb_int($settings['long_tour_min_group_review_days'] ?? null, 45), (int)atb_int($settings['long_tour_final_booking_cutoff_days'] ?? null, 7));
}

function atb_review_window(array $dep, string $today, string $kind, int $reviewDays, ?int $cutoffDays): array {
    $start = (string)($dep['start_date'] ?? '');
    $daysUntil = atb_days_between($today, $start);
    $unknown = atb_count_status($dep) === 'unknown';
    $min = atb_int($dep['min_group_size'] ?? null, null);
    $confirmed = max(0, (int)atb_int($dep['confirmed_count'] ?? 0, 0));
    $minReached = !$unknown && $min !== null && $min > 0 && $confirmed >= $min;
    $approved = ($dep['operational_approval'] ?? '') === 'approved';
    $reviewDue = $daysUntil <= $reviewDays;
    $state = 'open';
    if ($minReached && $approved) $state = 'confirmed';
    elseif (atb_exception_approved($dep)) $state = 'exception';
    elseif ($reviewDue && $unknown) $state = 'unknown'; // stays visible, manual contact only, until reconciled
    elseif ($reviewDue) $state = $minReached ? 'approval_required' : 'min_not_reached';
    $hasCutoff = $cutoffDays !== null;
    return [
        'applies' => true,
        'kind' => $kind,
        'days_until' => $daysUntil,
        'review_days' => $reviewDays,
        'cutoff_days' => $cutoffDays,
        'review_date' => atb_add_days($start, -$reviewDays),
        'cutoff_date' => $hasCutoff ? atb_add_days($start, -$cutoffDays) : null,
        'review_due' => $reviewDue,
        'review_overdue' => $daysUntil < $reviewDays && in_array($state, ['min_not_reached', 'approval_required'], true),
        'legacy_error' => $kind === 'long' && $daysUntil < 30 && $state === 'min_not_reached',
        'count_status' => $unknown ? 'unknown' : 'verified',
        'unknown_review' => $state === 'unknown',
        'unknown_immediate' => $hasCutoff && $state === 'unknown' && $daysUntil <= $cutoffDays,
        'manual_contact' => $state === 'unknown',
        'min_reached' => $minReached,
        'state' => $state,
        'booking_window_closed' => $hasCutoff && $daysUntil <= $cutoffDays,
    ];
}

/** @return array{key:string,label:string,selectable:bool,remaining:?int} */
function atb_compute_status(array $dep, string $today, array $settings = []): array {
    $stored = strtolower((string)($dep['status'] ?? ''));
    $min = atb_int($dep['min_group_size'] ?? null, null); // null = not set by owner → never Confirmed
    $cap = atb_int($dep['max_capacity'] ?? null, null);
    $confirmed = max(0, (int)atb_int($dep['confirmed_count'] ?? 0, 0));
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
    if (($settings['auto_cutoff_close'] ?? false) === true && is_string($cutoff) && atb_is_iso_date($cutoff) && $today > $cutoff) return $out('closed');
    if (($dep['departure_type'] ?? 'shared') === 'private' || $stored === 'on_request') return $out('on_request');
    if ($remaining === 0) return $out('sold_out');
    $lw = atb_long_tour_window($dep, $today, $settings);
    if ($lw['applies'] && in_array($lw['state'], ['min_not_reached', 'approval_required'], true)) return $out('review'); // admin decision required
    if (($dep['limited_manual'] ?? false) === true) return $out('limited'); // manual only — never automatic
    if ($min !== null && $min > 0 && $confirmed >= $min && ($dep['operational_approval'] ?? '') === 'approved') return $out('confirmed');
    if ($lw['applies'] && $lw['state'] === 'exception') return $out('confirmed'); // operating by approved exception
    return $out('open');
}

function atb_is_public(array $dep, string $today): bool {
    $stored = strtolower((string)($dep['status'] ?? ''));
    if (($dep['published'] ?? false) !== true) return false;
    if (in_array($stored, ['proposed', 'draft', 'cancelled', 'completed', 'on_request'], true)) return false;
    if (($dep['departure_type'] ?? 'shared') === 'private') return false;
    $end = (string)($dep['end_date'] ?? '');
    return atb_is_iso_date($end) && $end >= $today;
}

function atb_group_minimum_note(mixed $travelers, string $type, ?int $min = null): string {
    $n = (int)atb_int($travelers, 0);
    if ($type === 'private') return 'private';
    if ($n <= 0) return 'unknown';
    if (!$min) return 'minimum_not_set';
    return $n >= $min ? 'meets_minimum' : 'below_minimum';
}

function atb_price_label(?array $price, array $settings = []): string {
    $amount = $price['amount'] ?? ($price['reference_amount'] ?? null);
    $status = (string)($price['price_status'] ?? '');
    if (!is_numeric($amount) || (float)$amount <= 0 || $status === 'price_on_request' || ($price['display_on_site'] ?? true) === false) {
        return 'Price on request';
    }
    $num = number_format((float)$amount, 0, '.', ',');
    $prefix = is_string($settings['price_display_prefix'] ?? null) ? $settings['price_display_prefix'] : (!empty($settings['usd_confirmed']) ? 'USD ' : '$');
    $v = 'From ' . $prefix . $num . ' per person';
    return ($price['basis'] ?? '') === 'private_reference' ? $v : $v . ' on shared departures';
}

function atb_format_range(string $start, string $end): string {
    $a = new DateTimeImmutable($start . 'T00:00:00', new DateTimeZone('UTC'));
    $b = new DateTimeImmutable($end . 'T00:00:00', new DateTimeZone('UTC'));
    $left = $a->format('D j M') . ($a->format('Y') !== $b->format('Y') ? ' ' . $a->format('Y') : '');
    return $left . ' – ' . $b->format('D j M Y');
}

function atb_status_text(string $key, array $dep, array $settings = []): string {
    $min = atb_int($dep['min_group_size'] ?? null, null);
    return match ($key) {
        'open' => $min ? 'Open — awaiting minimum ' . $min . ' travelers' : 'Open — group minimum to be confirmed',
        'confirmed' => 'Confirmed — this departure will operate',
        'limited' => 'Limited — few places left',
        'sold_out' => 'Sold out',
        'closed' => 'Closed — no longer taking requests',
        default => ATB_STATUS_LABELS[$key] ?? 'Ask us',
    };
}

function atb_cta(string $key): string {
    return match ($key) {
        'open' => 'Request a Place',
        'confirmed', 'limited' => 'Join This Departure',
        'sold_out' => '', // sold out: no booking CTA
        default => 'Ask About Dates',
    };
}

/** 5+ day scheduled group tours → min 6 / normal max 18; shared ≤4-day departures → min 2, no standard max (owner decision 10 Oct 2026). */
function atb_group_rule(int $durationDays, array $settings = []): array {
    $r = (array)($settings['group_rule'] ?? []);
    if ($durationDays >= (int)atb_int($r['long_tour_min_days'] ?? null, 5)) {
        return ['applies' => true, 'min' => (int)atb_int($r['long_min'] ?? null, 6), 'max' => (int)atb_int($r['long_max'] ?? null, 18)];
    }
    return ['applies' => false, 'min' => atb_int($r['short_tour_shared_min'] ?? null, 2), 'max' => null];
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
        'min_group_size' => atb_int($dep['min_group_size'] ?? null, null),
        'status' => $st['key'],
        'status_label' => $st['label'],
        'status_text' => atb_status_text($st['key'], $dep, $settings),
        'selectable' => $st['selectable'],
        'cta' => atb_cta($st['key']),
        'price_label' => atb_price_label(is_array($dep['price'] ?? null) ? $dep['price'] : ($tour['price'] ?? null), $settings),
        'arrival_option' => $dep['arrival_option'] ?? null,
        'public_notes' => atb_str($dep['public_notes'] ?? '', 300),
        'booking_window_closed' => false,
        'last_minute' => false,
        'manual_contact' => false,
        'advisories' => array_map(static fn($p) => ['type' => 'ramadan', 'text' => ATB_RAMADAN_COMPACT, 'period' => $p['name'], 'state' => $p['state'], 'period_label' => atb_period_label($p)],
            atb_religious_flags($dep, (array)($settings['religious_calendar'] ?? []))['ramadan']),
    ];
    $lw = atb_long_tour_window($dep, $today, $settings);
    if ($lw['applies'] && $lw['state'] === 'unknown' && in_array($st['key'], ['open', 'limited'], true)) {
        $out['manual_contact'] = true;
        $out['selectable'] = false;
        $out['status_text'] = ATB_MANUAL_CONTACT_TEXT;
        $out['booking_window_closed'] = $lw['booking_window_closed'];
        $out['last_minute'] = $lw['booking_window_closed'];
        $out['cta'] = $lw['booking_window_closed'] ? ATB_LAST_MINUTE_CTA : ATB_CONTACT_CTA;
    } elseif ($lw['applies'] && ($lw['kind'] ?? '') === 'long' && atb_count_status($dep) === 'unknown' && $st['key'] === 'open' && atb_int($dep['min_group_size'] ?? null, null)) {
        $out['status_text'] = 'Open — minimum ' . atb_int($dep['min_group_size'], null) . ' travelers to operate';
    }
    if ($lw['applies'] && $lw['booking_window_closed'] && in_array($st['key'], ['confirmed', 'limited'], true) && empty($out['manual_contact'])) {
        $out['booking_window_closed'] = true;
        $out['selectable'] = false;
        $out['last_minute'] = true;
        $out['cta'] = ATB_LAST_MINUTE_CTA;
    }
    $cap = atb_int($dep['max_capacity'] ?? null, null);
    if (!empty($settings['show_public_capacity']) && $cap !== null) {
        $out['max_capacity'] = $cap;
        if (in_array($st['key'], ['confirmed', 'limited', 'sold_out'], true)) {
            $out['remaining_places'] = $st['remaining'];
        }
    }
    if (!empty($settings['show_public_confirmed_counts']) && ($dep['public_counts_approved'] ?? false) === true && atb_count_status($dep) === 'verified' && $out['departure_type'] === 'shared' && $out['min_group_size']) {
        $out['confirmed_text'] = max(0, (int)atb_int($dep['confirmed_count'] ?? 0, 0)) . ' of ' . $out['min_group_size'] . ' travelers confirmed.';
    }
    return $out;
}

/* ------------------------------------------------------- religious calendar */
// Mirrors src/lib/booking/core.mjs. Ramadan = advisory only. Eid = five-day block for standard scheduled departures.

const ATB_RAMADAN_TITLE = 'Ramadan Travel Advisory';
const ATB_RAMADAN_PARAGRAPHS = [
    'This departure takes place during Ramadan.',
    'AfghanTours remains open for business and tours continue to operate during Ramadan.',
    'Travelers should expect some adjustments to normal daily routines. Restaurant and shop opening hours may change, daytime meal arrangements may require additional planning, and some visits or activities may be scheduled differently around prayer times and the evening iftar period.',
    'Ramadan can also offer travelers a distinctive view of daily life in Afghanistan, particularly in the evenings when families and communities gather to break the fast.',
    'AfghanTours will plan the departure around the operating conditions and opening hours in effect at the time and advise confirmed travelers of any material itinerary adjustments.',
];
const ATB_RAMADAN_COMPACT = 'Ramadan departure — tours continue to operate, with some adjustments to opening hours, meals and daily scheduling.';
const ATB_EID_NOTICE = 'Eid operating period — standard scheduled departures are not available on these dates. If you need to travel during Eid, please contact AfghanTours to discuss a special arrangement.';
const ATB_EID_CHECKLIST = [
    'guide' => 'Guide', 'driver' => 'Driver', 'vehicle_availability' => 'Vehicle availability', 'hotels' => 'Hotels',
    'domestic_transport' => 'Domestic transport', 'site_access' => 'Site access', 'meals' => 'Meals',
    'local_operating_conditions' => 'Local operating conditions', 'itinerary_feasibility' => 'Itinerary feasibility',
];

function atb_ranges_overlap(string $aS, string $aE, string $bS, string $bE): bool {
    return atb_is_iso_date($aS) && atb_is_iso_date($aE) && atb_is_iso_date($bS) && atb_is_iso_date($bE) && $aS <= $bE && $aE >= $bS;
}

/** @return array{ramadan:array,eid:array} */
function atb_religious_periods(array $cal): array {
    $before = (int)atb_int($cal['eid_block']['days_before'] ?? null, 1);
    $after = (int)atb_int($cal['eid_block']['days_after'] ?? null, 3);
    $names = ['eid_al_fitr' => 'Eid al-Fitr', 'eid_al_adha' => 'Eid al-Adha'];
    $ram = []; $eid = [];
    foreach ((array)($cal['years'] ?? []) as $y) {
        $r = $y['ramadan'] ?? null;
        if (is_array($r) && atb_is_iso_date($r['start_date'] ?? null) && atb_is_iso_date($r['end_date'] ?? null)) {
            $ram[] = ['kind' => 'ramadan', 'name' => 'Ramadan ' . $y['year'], 'year' => $y['year'], 'start' => $r['start_date'], 'end' => $r['end_date'],
                'state' => ($r['state'] ?? '') === 'confirmed' ? 'confirmed' : 'estimated', 'source' => (string)($r['source'] ?? '')];
        }
        foreach ($names as $kind => $label) {
            $e = $y[$kind] ?? null;
            if (!is_array($e) || !atb_is_iso_date($e['date'] ?? null)) continue;
            $start = atb_add_days($e['date'], -$before);
            $end = atb_add_days($e['date'], $after);
            $eid[] = ['kind' => $kind, 'name' => $label . ' ' . $y['year'], 'year' => $y['year'], 'eid_date' => $e['date'], 'start' => $start, 'end' => $end,
                'key' => $kind . ':' . $start . ':' . $end, 'state' => ($e['state'] ?? '') === 'confirmed' ? 'confirmed' : 'estimated', 'source' => (string)($e['source'] ?? '')];
        }
    }
    return ['ramadan' => $ram, 'eid' => $eid];
}

function atb_religious_flags(array $dep, array $cal): array {
    $p = atb_religious_periods($cal);
    $s = (string)($dep['start_date'] ?? ''); $e = (string)($dep['end_date'] ?? '');
    return [
        'ramadan' => array_values(array_filter($p['ramadan'], static fn($x) => atb_ranges_overlap($s, $e, $x['start'], $x['end']))),
        'eid' => array_values(array_filter($p['eid'], static fn($x) => atb_ranges_overlap($s, $e, $x['start'], $x['end']))),
    ];
}

function atb_eid_conflicts(array $dep, array $cal): array {
    if (($dep['departure_type'] ?? 'shared') === 'private') return [];
    return atb_religious_flags($dep, $cal)['eid'];
}

function atb_eid_reviewed(array $dep, array $block): bool {
    $r = $dep['eid_reviews'][$block['key']] ?? null;
    return is_array($r) && ($r['override'] ?? false) === true && trim((string)($r['note'] ?? '')) !== '' && !empty($r['by']);
}

function atb_eid_unresolved(array $dep, array $cal): array {
    return array_values(array_filter(atb_eid_conflicts($dep, $cal), static fn($b) => !atb_eid_reviewed($dep, $b)));
}

function atb_period_label(array $p): string {
    return atb_format_range($p['start'], $p['end']) . (($p['state'] ?? '') === 'confirmed' ? '' : ' (expected)');
}

/** Blocks touching a date range (used for special-request manual review). */
function atb_eid_blocks_for_range(string $start, string $end, array $cal): array {
    if (!atb_is_iso_date($start)) return [];
    if (!atb_is_iso_date($end)) $end = $start;
    return array_values(array_filter(atb_religious_periods($cal)['eid'], static fn($b) => atb_ranges_overlap($start, $end, $b['start'], $b['end'])));
}

/** Upcoming Eid blocks for the public notice (only blocks that have not ended). */
function atb_public_eid_blocks(array $cal, string $today): array {
    $out = [];
    foreach (atb_religious_periods($cal)['eid'] as $b) {
        if ($b['end'] < $today) continue;
        $out[] = ['name' => $b['name'], 'start' => $b['start'], 'end' => $b['end'], 'state' => $b['state'], 'label' => atb_period_label($b)];
    }
    return $out;
}

/** A booking counts toward the minimum only when accepted AND payment is recorded as received. */
function atb_payment_received(array $tr): bool {
    return ($tr['payment_received'] ?? false) === true || in_array($tr['payment_status'] ?? '', ['payment_received', 'deposit_received', 'deposit_recorded', 'paid_recorded'], true);
}
function atb_counts_toward_minimum(array $tr): bool {
    // Owner 10 Oct 2026 20:47: counts after acceptance by AfghanTours + the 25% deposit (or full payment) recorded as received.
    return in_array($tr['status'] ?? '', ['accepted', 'confirmed'], true) && atb_payment_received($tr);
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
    $cal = atb_read_json_file($dir . '/religious-calendar.json');
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
        'religious_calendar' => $cal ?? ['years' => []],
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
            $inv = atb_migrate_inventory($inv);
            return $cache = [$inv, 'private_store'];
        }
    }
    $seed = atb_load_seed();
    if ($seed !== null) {
        return $cache = [$seed, 'seed_readonly'];
    }
    return $cache = [['tours' => [], 'departures' => [], 'blackouts' => [], 'settings' => [], 'categories' => []], 'unavailable'];
}

/**
 * Bring an older private store up to the current model in memory (saved on the next admin write):
 * religious calendar from the seed, Eid/Ramadan out of blackouts, no automatic Limited threshold.
 */
function atb_migrate_inventory(array $inv): array {
    if (!isset($inv['religious_calendar']) || !is_array($inv['religious_calendar'])) {
        $dir = atb_seed_dir();
        $inv['religious_calendar'] = ($dir ? atb_read_json_file($dir . '/religious-calendar.json') : null) ?? ['years' => []];
        $inv['blackouts'] = array_values(array_filter((array)($inv['blackouts'] ?? []), static fn($b) => !array_intersect((array)($b['tags'] ?? []), ['eid', 'ramadan'])));
    }
    unset($inv['settings']['limited_places_threshold']);
    foreach ($inv['departures'] ?? [] as &$md) {
        if (isset($md['traveler_count_status'])) continue;
        $legacy = str_starts_with((string)($md['source'] ?? ''), 'production_') && empty($md['reconciliation']);
        $md['traveler_count_status'] = $legacy ? 'unknown' : 'verified';
        if ($legacy) { $md['confirmed_count'] = null; $md['pending_count'] = null; }
    }
    unset($md);
    $inv['settings']['long_tour_min_group_review_days'] = (int)($inv['settings']['long_tour_min_group_review_days'] ?? 45);
    $inv['settings']['long_tour_final_booking_cutoff_days'] = (int)($inv['settings']['long_tour_final_booking_cutoff_days'] ?? 7);
    $inv['settings']['auto_cutoff_close'] = ($inv['settings']['auto_cutoff_close'] ?? false) === true;
    return $inv;
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
        $out[$id] += ['accepted_unpaid' => 0];
        if (atb_counts_toward_minimum($t)) $out[$id]['confirmed'] += $n;
        elseif (in_array($t['status'] ?? '', ['accepted', 'confirmed'], true)) $out[$id]['accepted_unpaid'] += $n; // accepted, payment not recorded → does not count
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
        $cs = atb_count_status($d);
        $d['traveler_count_status'] = $cs;
        if ($useTravelers) {
            $c = $counts[$d['id']] ?? ['confirmed' => 0, 'pending' => 0, 'accepted_unpaid' => 0];
            $d['accepted_unpaid_count'] = $c['accepted_unpaid'] ?? 0;
            if ($cs === 'unknown') {
                // Unknown ≠ zero: records entered so far are shown to staff but are not the authoritative count.
                $d['recorded_confirmed_count'] = $c['confirmed'];
                $d['confirmed_count'] = null;
                $d['pending_count'] = $c['pending'];
            } else {
                $rec = (array)($d['reconciliation'] ?? []);
                $d['confirmed_count'] = (int)($rec['offline_qualifying'] ?? 0) + $c['confirmed'];
                $d['pending_count'] = (int)($rec['offline_pending'] ?? 0) + $c['pending'];
            }
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
    $cal = (array)($inv['religious_calendar'] ?? []);
    $settings['religious_calendar'] = $cal;
    $today = atb_today($settings['timezone'] ?? 'Asia/Kabul');
    $deps = atb_effective_departures($inv);
    $list = [];
    foreach ($deps as $d) {
        if ($tourSlug !== null && $tourSlug !== '' && ($d['tour_slug'] ?? '') !== $tourSlug) continue;
        if (!atb_is_listed($d, $today, $settings)) continue; // public + no unresolved Eid conflict + not held for a long-tour decision
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
        'price_display_prefix' => is_string($settings['price_display_prefix'] ?? null) ? $settings['price_display_prefix'] : null,
        'eid_blocks' => atb_public_eid_blocks($cal, $today),
        'eid_notice' => ATB_EID_NOTICE,
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
function atb_validate_departure(array $dep, array $inv, string $today, bool $forPublish, bool $publishing = false): array {
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
    if ($forPublish) {
        foreach ((array)($inv['departures'] ?? []) as $o) {
            if (($o['id'] ?? '') === ($dep['id'] ?? null) || empty($o['published']) || in_array($o['status'] ?? '', ['cancelled', 'proposed', 'draft'], true)) continue;
            if (($o['tour_slug'] ?? '') === ($dep['tour_slug'] ?? '') && ($o['start_date'] ?? '') === $start && (($o['departure_type'] ?? 'shared') === ($dep['departure_type'] ?? 'shared'))) {
                $errors[] = 'Another published departure (' . $o['id'] . ') already starts on ' . $start . ' for this tour — do not publish a duplicate.';
            }
        }
    }
    if ($end < $start) $errors[] = 'End date is before start date.';
    $days = (int)$t['duration_days'];
    if (atb_inclusive_days($start, $end) !== $days && empty($dep['date_check_override'])) {
        $errors[] = sprintf('%s – %s is %d days inclusive; %s is %d days (end should be %s).', $start, $end, atb_inclusive_days($start, $end), $t['name'], $days, atb_expected_end($start, $days));
    }
    if (!in_array($dep['status'] ?? '', ATB_STORED_STATUSES, true)) $errors[] = 'Unknown status.';
    if (!in_array($dep['departure_type'] ?? '', ['shared', 'private'], true)) $errors[] = 'Type must be shared or private.';
    $min = atb_int($dep['min_group_size'] ?? null, null);
    $cap = $dep['max_capacity'] ?? null;
    $shared = ($dep['departure_type'] ?? '') === 'shared';
    $rule = atb_group_rule((int)($t['duration_days'] ?? 0), (array)($inv['settings'] ?? []));
    $exception = trim((string)($dep['group_exception_note'] ?? '')) !== '';
    if ($min !== null && $min < 1) $errors[] = 'Minimum group size must be at least 1.';
    if ($shared && $rule['applies'] && !$exception && ($min !== $rule['min'] || ($cap !== null && $cap > $rule['max']))) {
        $errors[] = 'Scheduled group tours of 5+ days operate with a minimum of ' . $rule['min'] . ' and a normal maximum of ' . $rule['max'] . ' travelers. Record the approved exception to use other numbers.';
    }
    if ($shared && !$rule['applies'] && !$exception && $min !== $rule['min']) $errors[] = 'Shared departures of 4 days or less operate with a minimum of ' . $rule['min'] . ' confirmed travelers. Record the approved exception to use another number.';
    if (!$shared && $min === null) $errors[] = 'Minimum group size must be at least 1.';
    if ($cap !== null && (!is_int($cap) || ($min !== null && $cap < $min))) $errors[] = 'Maximum capacity must be a whole number at least the minimum.';
    $cut = $dep['booking_cutoff'] ?? null;
    if ($cut !== null && (!atb_is_iso_date($cut) || $cut > $start)) $errors[] = 'Booking cutoff must be a date on or before the start date.';
    if ($forPublish) {
        if (!$shared) $errors[] = 'Private departures are individual bookings and are never listed publicly.';
        if ($shared && $rule['applies'] && $cap === null) $errors[] = 'Set a maximum capacity before publishing.';
        if ($start <= $today) $errors[] = 'Only future departures can be published.';
        if (in_array($dep['status'] ?? '', ['proposed', 'draft', 'cancelled', 'completed'], true)) $errors[] = 'Change the status to Scheduled (or On request) before publishing.';
        foreach (atb_blackouts_for($inv, (string)$dep['tour_slug'], $start, $end) as $b) {
            if (!empty($b['confirmed'])) $errors[] = 'Overlaps confirmed blackout: ' . ($b['name'] ?? $b['id']) . '.';
        }
    }
    if ($publishing) {
        if (($dep['price_approved'] ?? null) !== true) $errors[] = 'Price not approved: a production reference price is not approval. Tick "Price approved by owner" first.';
        foreach (atb_eid_unresolved($dep, (array)($inv['religious_calendar'] ?? [])) as $b) {
            $errors[] = 'Eid conflict: overlaps the ' . $b['name'] . ' operating period ' . $b['start'] . ' – ' . $b['end'] . ' (' . $b['state'] . '). Standard scheduled departures are not available then; record an owner/operational review override with a note first.';
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
