<?php
declare(strict_types=1);

/**
 * Unified AfghanTours inquiry handler.
 * Supports flows: scheduled | private-fixed | custom | activity | specialist | return | general
 * Backward-compatible with legacy tour modal fields (tour / tour_name / tour_slug / travelers / group_size).
 *
 * Dry-run: POST dry_run=1 returns JSON without calling mail(), but ONLY when allowed
 * (CLI, localhost, or AFGHANTOURS_DRY_RUN_KEY match). Production hosts reject open dry_run.
 */

const INQUIRY_TO = 'info@afghantours.com';
const INQUIRY_FROM = 'AfghanTours Website <info@afghantours.com>';
const RESERVATIONS_TO = 'reservations@afghantours.com';
const MAX_NAME = 120;
const MAX_EMAIL = 190;
const MAX_WHATSAPP = 40;
const MAX_SUBJECT_ENTITY = 160;
const MAX_FIELD = 500;
const MAX_NOTES = 4000;
const MAX_URL = 500;
const INQUIRY_CONFIRMATION = 'Your request has been received. Our team will confirm availability, arrangements, and next steps.';

// Optional booking inventory (departures, private inquiry store). Email-only if absent.
$bookingLib = __DIR__ . '/booking/lib/booking.php';
$bookingAvailable = is_file($bookingLib);
if ($bookingAvailable) {
    require_once $bookingLib;
}

function field(string $name): string {
    return trim((string)($_POST[$name] ?? ''));
}

function first_nonempty(string ...$names): string {
    foreach ($names as $name) {
        $value = field($name);
        if ($value !== '') {
            return $value;
        }
    }
    return '';
}

/** Strip CR/LF and other header-breaking control chars. */
function sanitize_header_value(string $value, int $maxLen): string {
    $value = str_replace(["\r", "\n", "\0"], '', $value);
    $value = preg_replace('/[\x00-\x1F\x7F]/u', '', $value) ?? '';
    $value = trim($value);
    if ($maxLen > 0 && strlen($value) > $maxLen) {
        $value = substr($value, 0, $maxLen);
    }
    return $value;
}

function clamp_field(string $value, int $maxLen): string {
    // Strip NULs and CR/LF everywhere so values cannot break mail headers if reused.
    $value = str_replace(["\0", "\r", "\n"], ['', ' ', ' '], $value);
    $value = trim($value);
    if ($maxLen <= 0) {
        return $value;
    }
    if (function_exists('mb_strlen') && function_exists('mb_substr')) {
        if (mb_strlen($value) > $maxLen) {
            return mb_substr($value, 0, $maxLen);
        }
        return $value;
    }
    if (strlen($value) > $maxLen) {
        return substr($value, 0, $maxLen);
    }
    return $value;
}

function wants_json(): bool {
    $accept = (string)($_SERVER['HTTP_ACCEPT'] ?? '');
    return str_contains($accept, 'application/json')
        || field('format') === 'json'
        || field('ajax') === '1';
}

function is_local_host(): bool {
    $host = strtolower((string)($_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? ''));
    $host = preg_replace('/:\d+$/', '', $host) ?? $host;
    if ($host === '' || $host === 'localhost' || $host === '127.0.0.1' || $host === '::1') {
        return true;
    }
    if (str_ends_with($host, '.local') || str_ends_with($host, '.test')) {
        return true;
    }
    // Private LAN typical for local PHP built-in / cPanel staging boxes during QA.
    if (preg_match('/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/', $host)) {
        return true;
    }
    return false;
}

function dry_run_key_ok(): bool {
    $expected = getenv('AFGHANTOURS_DRY_RUN_KEY');
    if ($expected === false || $expected === '') {
        // Default local QA key — production must set a strong env key or rely on host checks.
        $expected = 'local-qa-only';
    }
    $provided = first_nonempty('dry_run_key', 'qa_key');
    $header = (string)($_SERVER['HTTP_X_AFGHANTOURS_DRY_RUN_KEY'] ?? '');
    return ($provided !== '' && hash_equals($expected, $provided))
        || ($header !== '' && hash_equals($expected, $header));
}

function is_dry_run_requested(): bool {
    if (field('dry_run') === '1' || field('dry_run') === 'true') {
        return true;
    }
    $header = (string)($_SERVER['HTTP_X_AFGHANTOURS_DRY_RUN'] ?? '');
    return $header === '1' || strcasecmp($header, 'true') === 0;
}

function is_dry_run_allowed(): bool {
    if (PHP_SAPI === 'cli') {
        return true;
    }
    if (is_local_host()) {
        return true;
    }
    return dry_run_key_ok();
}

function respond_json(int $code, array $payload): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function respond_html_error(int $code, string $message): void {
    http_response_code($code);
    header('Content-Type: text/plain; charset=UTF-8');
    echo $message;
    exit;
}

function normalize_flow(string $flow, string $entityType, string $productClass, string $typeHint): string {
    $flow = strtolower(trim($flow));
    $entityType = strtolower(trim($entityType));
    $productClass = strtolower(trim($productClass));
    $typeHint = strtolower(trim($typeHint));

    $aliases = [
        'tour' => '',
        'custom-tour' => 'custom',
        'custom_tour' => 'custom',
        'build-my-journey' => 'custom',
        'specialist-service' => 'specialist',
        'return-journey' => 'return',
        'private' => 'private-fixed',
        'private_fixed' => 'private-fixed',
        'fixed' => 'private-fixed',
    ];
    if (isset($aliases[$flow])) {
        $flow = $aliases[$flow] !== '' ? $aliases[$flow] : $flow;
    }

    $allowed = ['scheduled', 'private-fixed', 'custom', 'activity', 'specialist', 'return', 'general'];
    if (in_array($flow, $allowed, true)) {
        // Explicit scheduled must win even if product_class is missing/wrong later.
        return $flow;
    }

    if (in_array($typeHint, $allowed, true)) {
        return $typeHint;
    }
    if ($typeHint === 'custom-tour' || $typeHint === 'custom_tour') {
        return 'custom';
    }

    if (in_array($entityType, ['activity'], true)) {
        return 'activity';
    }
    if (in_array($entityType, ['specialist', 'specialist-service'], true)) {
        return 'specialist';
    }
    if (in_array($entityType, ['return', 'return-journey'], true)) {
        return 'return';
    }
    if (in_array($entityType, ['custom', 'custom-journey'], true)) {
        return 'custom';
    }
    if (in_array($entityType, ['tour'], true) || $productClass !== '') {
        if ($productClass === 'scheduled') {
            return 'scheduled';
        }
        if ($productClass === 'private-fixed' || $productClass === 'private') {
            return 'private-fixed';
        }
        return 'private-fixed';
    }

    return 'general';
}

function flow_label(string $flow): string {
    return match ($flow) {
        'scheduled' => 'Scheduled tour inquiry',
        'private-fixed' => 'Private fixed tour inquiry',
        'custom' => 'Custom journey / Build My Journey inquiry',
        'activity' => 'Activity inquiry',
        'specialist' => 'Specialist service inquiry',
        'return' => 'Return journey inquiry',
        default => 'General contact inquiry',
    };
}

function is_tour_flow(string $flow): bool {
    return $flow === 'scheduled' || $flow === 'private-fixed';
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    if (wants_json()) {
        respond_json(405, ['ok' => false, 'message' => 'Method not allowed']);
    }
    respond_html_error(405, 'Method not allowed');
}

// Honeypot: bots often fill hidden fields.
if (field('website') !== '' || field('company_url') !== '') {
    if (wants_json() || is_dry_run_requested()) {
        respond_json(204, ['ok' => true, 'message' => 'Ignored']);
    }
    http_response_code(204);
    exit;
}

$dryRunRequested = is_dry_run_requested();
if ($dryRunRequested && !is_dry_run_allowed()) {
    respond_json(403, [
        'ok' => false,
        'message' => 'Dry-run is disabled on this host. Set AFGHANTOURS_DRY_RUN_KEY or use localhost/CLI.',
    ]);
}

$name = clamp_field(field('name'), MAX_NAME);
$email = clamp_field(field('email'), MAX_EMAIL);
$whatsapp = clamp_field(first_nonempty('whatsapp', 'phone', 'tel'), MAX_WHATSAPP);
$contactCombined = clamp_field(field('contact'), MAX_EMAIL);

if ($email === '' && $whatsapp === '' && $contactCombined !== '') {
    if (filter_var($contactCombined, FILTER_VALIDATE_EMAIL)) {
        $email = $contactCombined;
    } else {
        $whatsapp = clamp_field($contactCombined, MAX_WHATSAPP);
    }
}

// Canonical entity fields first, then legacy aliases (first_nonempty order).
$entityName = clamp_field(first_nonempty('entity_name', 'tour_name', 'tour', 'service_name', 'journey_name', 'activity_name', 'interest'), MAX_SUBJECT_ENTITY);
$entitySlug = clamp_field(first_nonempty('entity_slug', 'tour_slug', 'service', 'service_slug', 'journey', 'journey_slug', 'activity', 'activity_slug'), 120);
$entityCode = clamp_field(first_nonempty('entity_code', 'tour_code', 'service_code', 'journey_code', 'activity_code'), 40);
$entityType = clamp_field(first_nonempty('entity_type', 'product_type'), 40);
$productClass = clamp_field(first_nonempty('product_class', 'tour_class'), 40);
$typeHint = clamp_field(first_nonempty('type', 'inquiry_type'), 40);
$flow = normalize_flow(field('flow'), $entityType, $productClass, $typeHint);

// Do not demote explicit scheduled when product_class is absent/wrong.
if (strtolower(field('flow')) === 'scheduled' || strtolower($productClass) === 'scheduled') {
    $flow = 'scheduled';
}

$sourceUrl = clamp_field(first_nonempty('source_url', 'page_url', 'tour_url'), MAX_URL);
$preferredDates = clamp_field(first_nonempty('preferred_dates', 'travel_dates', 'dates'), MAX_FIELD);
$travelers = clamp_field(first_nonempty('travelers', 'group_size'), 40);
$preferredHub = clamp_field(first_nonempty('preferred_hub', 'hub'), 120);
$accommodation = clamp_field(field('accommodation'), MAX_FIELD);
$transport = clamp_field(field('transport'), MAX_FIELD);
$activities = clamp_field(field('activities'), MAX_FIELD);
$culturalInterests = clamp_field(field('cultural_interests'), MAX_FIELD);
$experienceLevel = clamp_field(field('experience_level'), MAX_FIELD);
$availableTime = clamp_field(field('available_time'), MAX_FIELD);
$notes = clamp_field(first_nonempty('notes', 'message'), MAX_NOTES);
$country = clamp_field(field('country'), 80);
$interest = clamp_field(field('interest'), MAX_FIELD);

// Booking fields (spec Part 7). All optional; existing fields above are unchanged.
$departureId = clamp_field(field('departure_id'), 60);
$departureStart = clamp_field(field('departure_start'), 10);
$departureEnd = clamp_field(field('departure_end'), 10);
$bookingType = strtolower(clamp_field(field('booking_type'), 20));
if (!in_array($bookingType, ['shared', 'private'], true)) {
    $bookingType = '';
}
$arrivalOption = strtolower(clamp_field(field('arrival_option'), 20));
if (!in_array($arrivalOption, ['fri-sun', 'sat-mon'], true)) {
    $arrivalOption = '';
}
$extensionNights = clamp_field(field('extension_nights'), 10);
$extrasRaw = $_POST['extras'] ?? '';
if (is_array($extrasRaw)) {
    $extrasRaw = implode('; ', array_map(static fn($v) => is_scalar($v) ? (string)$v : '', $extrasRaw));
}
$extras = clamp_field((string)$extrasRaw, MAX_FIELD);

if ($name === '') {
    $msg = 'Please provide your name.';
    if (wants_json() || $dryRunRequested) {
        respond_json(400, ['ok' => false, 'message' => $msg]);
    }
    respond_html_error(400, $msg);
}

if ($email === '' && $whatsapp === '') {
    $msg = 'Please provide an email address or WhatsApp number.';
    if (wants_json() || $dryRunRequested) {
        respond_json(400, ['ok' => false, 'message' => $msg]);
    }
    respond_html_error(400, $msg);
}

if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $msg = 'Please provide a valid email address, or leave email blank and use WhatsApp.';
    if (wants_json() || $dryRunRequested) {
        respond_json(400, ['ok' => false, 'message' => $msg]);
    }
    respond_html_error(400, $msg);
}

$email = sanitize_header_value($email, MAX_EMAIL);

if ($departureId !== '' && !preg_match('/^[A-Za-z0-9-]{3,60}$/', $departureId)) {
    $msg = 'That departure reference is not valid. Please choose a date again or ask us about dates.';
    if (wants_json() || $dryRunRequested) {
        respond_json(400, ['ok' => false, 'message' => $msg]);
    }
    respond_html_error(400, $msg);
}

// Verify a selected departure against the authoritative inventory: only published, open, future
// departures can be requested (past / closed / proposed ones cannot be requested as scheduled dates).
$departureCheck = $departureId !== '' ? 'not_checked' : 'none';
$groupNote = '';
$atbEidOpen = [];
$manualContact = false;
$lastMinute = in_array(strtolower(field('last_minute')), ['1', 'true', 'yes'], true);
$lastMinuteForced = false;
if ($departureId !== '' && $bookingAvailable) {
    try {
        [$atbInv, $atbSource] = atb_load_inventory();
        $atbSettings = $atbInv['settings'] ?? [];
        $atbToday = atb_today($atbSettings['timezone'] ?? 'Asia/Kabul');
        $atbDep = atb_find_departure(atb_effective_departures($atbInv), $departureId);
        $atbEidOpen = $atbDep ? atb_eid_unresolved($atbDep, (array)($atbInv['religious_calendar'] ?? [])) : [];
        if ($atbSource === 'unavailable') {
            $departureCheck = 'inventory_unavailable';
        } elseif ($atbDep === null || !atb_is_public($atbDep, $atbToday)) {
            $msg = 'That departure is not open for requests. Please choose another date, or ask us about dates.';
            if (wants_json() || $dryRunRequested) {
                respond_json(409, ['ok' => false, 'message' => $msg]);
            }
            respond_html_error(409, $msg);
        } else {
            $atbStatus = atb_compute_status($atbDep, $atbToday, $atbSettings);
            $atbWin = atb_long_tour_window($atbDep, $atbToday, $atbSettings);
            $manualContact = $atbWin['applies'] && ($atbWin['state'] ?? '') === 'unknown' && in_array($atbStatus['key'], ['open', 'limited'], true);
            $inCutoff = $atbWin['applies'] && $atbWin['booking_window_closed'] && in_array($atbStatus['key'], ['confirmed', 'limited', 'open'], true) && ($manualContact || $atbStatus['key'] !== 'open');
            if ($inCutoff) {
                // Final booking cutoff: never a normal selection — always a last-minute request for manual review.
                if (!$lastMinute) $lastMinuteForced = true;
                $lastMinute = true;
            }
            if (!$atbStatus['selectable'] && !$atbEidOpen && !$inCutoff && !$manualContact) {
                $msg = 'That departure is ' . strtolower($atbStatus['label']) . ' and not open for requests. Please choose another date, or ask us about dates.';
                if (wants_json() || $dryRunRequested) {
                    respond_json(409, ['ok' => false, 'message' => $msg]);
                }
                respond_html_error(409, $msg);
            }
            // Authoritative dates win over whatever the browser sent.
            $departureStart = (string)$atbDep['start_date'];
            $departureEnd = (string)$atbDep['end_date'];
            // Eid conflict awaiting review: still accept the inquiry, but route it to manual review (never a normal confirmation).
            $departureCheck = $atbEidOpen ? 'eid_review_required' : ($inCutoff ? 'last_minute_request' : ($manualContact ? 'manual_contact_request' : 'verified:' . $atbStatus['key']));
            if ($bookingType === '') {
                $bookingType = ($atbDep['departure_type'] ?? 'shared') === 'private' ? 'private' : 'shared';
            }
            if ($entitySlug === '') {
                $entitySlug = (string)$atbDep['tour_slug'];
            }
        }
    } catch (Throwable $e) {
        error_log('[afghantours inquiry] departure check failed: ' . $e->getMessage());
        $departureCheck = 'inventory_error';
    }
}
if ($bookingAvailable) {
    // Minimum comes from the selected departure, else from the tour's group rule (6 for 5+ day tours; owner-set for ≤4 days).
    $groupMin = null;
    try {
        if (isset($atbDep) && is_array($atbDep)) {
            $groupMin = atb_int($atbDep['min_group_size'] ?? null, null);
        } elseif ($entitySlug !== '') {
            [$atbInv2] = atb_load_inventory();
            $atbTour = atb_tour($atbInv2, $entitySlug);
            if ($atbTour && in_array($atbTour['category'] ?? '', ['A', 'B', 'C'], true)) {
                $groupMin = atb_group_rule((int)($atbTour['duration_days'] ?? 0), (array)($atbInv2['settings'] ?? []))['min'];
            }
        }
    } catch (Throwable $e) {
        $groupMin = null;
    }
    $note = atb_group_minimum_note($travelers, $bookingType !== '' ? $bookingType : 'shared', $groupMin);
    $groupNote = match ($note) {
        'private' => 'Private request — quoted separately; no group minimum applies.',
        'below_minimum' => 'Shared request for ' . (int)$travelers . ' traveler(s), below the ' . $groupMin . '-traveler minimum to operate. Accept as a request/booking; the departure stays open until ' . $groupMin . ' travelers are confirmed and operations approve it.',
        'meets_minimum' => 'Shared request for ' . (int)$travelers . ' travelers: meets the ' . $groupMin . '-traveler minimum once they are confirmed (still needs operational approval).',
        'minimum_not_set' => 'Shared request for ' . (int)$travelers . ' traveler(s). No group minimum is set for this tour yet (owner decision).',
        default => 'Number of travelers not given.',
    };
}

// Tour flows: require an entity name/slug so staff know which tour.
// Non-tour flows must NOT require tour_code / tour_name.
if (is_tour_flow($flow) && $entityName === '' && $entitySlug === '') {
    $msg = 'Please indicate which tour you are inquiring about.';
    if (wants_json() || $dryRunRequested) {
        respond_json(400, ['ok' => false, 'message' => $msg]);
    }
    respond_html_error(400, $msg);
}

if ($entityType === '') {
    $entityType = match ($flow) {
        'scheduled', 'private-fixed' => 'tour',
        'custom' => 'custom',
        'activity' => 'activity',
        'specialist' => 'specialist',
        'return' => 'return',
        default => 'general',
    };
}

// Eid: inquiries are always accepted; any request whose dates touch an Eid operating block
// (private / custom / specialist special requests, or a departure awaiting Eid review) goes to MANUAL REVIEW.
$manualReview = null;
if ($bookingAvailable) {
    try {
        [$atbInv3] = atb_load_inventory();
        $calR = (array)($atbInv3['religious_calendar'] ?? []);
        $rs = $departureStart; $re = $departureEnd;
        if (!atb_is_iso_date($rs) && preg_match_all('/\b(\d{4}-\d{2}-\d{2})\b/', $preferredDates, $m)) {
            $ds = array_values(array_filter($m[1], 'atb_is_iso_date'));
            sort($ds);
            if ($ds) { $rs = $ds[0]; $re = $ds[count($ds) - 1]; }
        }
        $hits = atb_is_iso_date($rs) ? atb_eid_blocks_for_range($rs, atb_is_iso_date($re) ? $re : $rs, $calR) : [];
        $reviewed = isset($atbDep) && is_array($atbDep) && !$atbEidOpen && ($atbDep['departure_type'] ?? 'shared') !== 'private';
        if ($hits && !$reviewed) {
            $manualReview = [
                'reason' => 'eid',
                'label' => 'Eid special request',
                'blocks' => array_map(static fn($b) => $b['name'] . ' ' . $b['start'] . '–' . $b['end'] . ' (' . $b['state'] . ')', $hits),
                'detail' => 'Requested dates ' . $rs . ($re !== $rs ? ' to ' . $re : '') . ' touch the Eid operating period. Standard scheduled departures are not available then; review guide, driver, vehicle availability, hotels, domestic transport, site access, meals, local operating conditions and itinerary feasibility before offering anything.',
                'checklist' => array_keys(ATB_EID_CHECKLIST),
                'auto_confirm' => false,
            ];
        }
    } catch (Throwable $e) {
        error_log('[afghantours inquiry] Eid check failed: ' . $e->getMessage());
    }
}

// Last-minute request (inside the final booking cutoff): manual review, never auto-accepted, never counts toward capacity.
if ($departureCheck === 'manual_contact_request') {
    // Legacy departure with an unknown traveler count inside its review window: manual contact only.
    $manualReview = $manualReview ?? [
        'reason' => 'manual_contact',
        'label' => 'Availability request — traveler count not yet reconciled',
        'blocks' => [],
        'detail' => 'Reconcile this departure\'s traveler count in /manage/ before replying; make no promises; confirm manually.',
        'checklist' => [],
        'auto_confirm' => false,
    ];
}
if ($lastMinute && $departureCheck === 'last_minute_request') {
    $manualReview = $manualReview ?? [
        'reason' => 'last_minute',
        'label' => 'Last-minute availability request',
        'blocks' => [],
        'detail' => 'Inside the final booking cutoff for this departure. Check hotel, flight, permit and operational availability before replying; make no promises; confirm manually.',
        'checklist' => [],
        'auto_confirm' => false,
    ];
} elseif ($lastMinute) {
    $lastMinute = false; // flag only applies to a verified departure inside its cutoff
}

$classification = flow_label($flow);
$displayName = $entityName !== '' ? $entityName : ($entitySlug !== '' ? $entitySlug : 'General inquiry');
$displayName = sanitize_header_value($displayName, MAX_SUBJECT_ENTITY);
$subject = sanitize_header_value('AfghanTours ' . $classification . ': ' . $displayName, 200);

$lines = [
    'New AfghanTours inquiry',
    '',
    'Classification: ' . $classification,
    'Flow: ' . $flow,
    'Entity type: ' . $entityType,
    'Entity name: ' . ($entityName !== '' ? $entityName : '(none)'),
    'Entity slug: ' . ($entitySlug !== '' ? $entitySlug : '(none)'),
    'Entity code: ' . ($entityCode !== '' ? $entityCode : '(none)'),
    'Product class: ' . ($productClass !== '' ? $productClass : '(none)'),
    'Source URL: ' . ($sourceUrl !== '' ? $sourceUrl : '(none)'),
    '',
    'Name: ' . $name,
    'Email: ' . ($email !== '' ? $email : '(not provided)'),
    'WhatsApp: ' . ($whatsapp !== '' ? $whatsapp : '(not provided)'),
    'Country: ' . ($country !== '' ? $country : '(not provided)'),
    'Preferred dates: ' . ($preferredDates !== '' ? $preferredDates : '(not provided)'),
    'Travelers: ' . ($travelers !== '' ? $travelers : '(not provided)'),
    'Preferred hub: ' . ($preferredHub !== '' ? $preferredHub : '(not provided)'),
];

if ($departureId !== '' || $bookingType !== '' || $arrivalOption !== '' || $extensionNights !== '' || $extras !== '') {
    $lines[] = '';
    $lines[] = 'Departure ID: ' . ($departureId !== '' ? $departureId : '(none — dates to be discussed)');
    $lines[] = 'Departure dates: ' . ($departureStart !== '' ? $departureStart . ' to ' . $departureEnd : '(none)');
    $lines[] = 'Departure check: ' . $departureCheck;
    $lines[] = 'Shared / private: ' . ($bookingType !== '' ? $bookingType : '(not sure)');
    if ($arrivalOption !== '') {
        $lines[] = 'Arrival option: ' . ($arrivalOption === 'fri-sun' ? 'Friday–Sunday' : 'Saturday–Monday');
    }
    $lines[] = 'Extra nights: ' . ($extensionNights !== '' ? $extensionNights : '(none)');
    if ($extras !== '') {
        $lines[] = 'Additional options: ' . $extras;
    }
}
if ($groupNote !== '') {
    $lines[] = 'Group minimum: ' . $groupNote;
}
if ($manualReview !== null) {
    $lines[] = '';
    $lines[] = 'MANUAL REVIEW REQUIRED — ' . $manualReview['label'] . ($manualReview['blocks'] ? ': ' . implode('; ', $manualReview['blocks']) : '') . '.';
    $lines[] = $manualReview['detail'];
    $lines[] = 'Do not confirm or promise this request until the review is complete.';
}
$lines[] = 'Note: this is a request only — nothing is confirmed or paid until the team confirms it.';

$optionalBlocks = [
    'Accommodation' => $accommodation,
    'Transport' => $transport,
    'Activities' => $activities,
    'Cultural interests' => $culturalInterests,
    'Experience level' => $experienceLevel,
    'Available time' => $availableTime,
    'Interest (legacy/prefill)' => $interest,
];
foreach ($optionalBlocks as $label => $value) {
    if ($value !== '') {
        $lines[] = $label . ': ' . $value;
    }
}

$lines[] = '';
$lines[] = 'Notes / message:';
$lines[] = $notes !== '' ? $notes : '(none)';

$body = implode("\n", $lines);

$inquiryRecord = [
    'flow' => $flow, 'classification' => $classification, 'entity_type' => $entityType, 'entity_name' => $entityName,
    'entity_slug' => $entitySlug, 'entity_code' => $entityCode, 'product_class' => $productClass, 'source_url' => $sourceUrl,
    'name' => $name, 'email' => $email, 'whatsapp' => $whatsapp, 'country' => $country,
    'preferred_dates' => $preferredDates, 'travelers' => $travelers, 'preferred_hub' => $preferredHub,
    'departure_id' => $departureId, 'departure_start' => $departureStart, 'departure_end' => $departureEnd, 'departure_check' => $departureCheck,
    'booking_type' => $bookingType, 'arrival_option' => $arrivalOption, 'accommodation' => $accommodation,
    'extension_nights' => $extensionNights, 'extras' => $extras, 'transport' => $transport, 'activities' => $activities,
    'cultural_interests' => $culturalInterests, 'experience_level' => $experienceLevel, 'available_time' => $availableTime,
    'interest' => $interest, 'notes' => $notes, 'group_minimum' => $groupNote,
    'manual_review' => $manualReview,
    'last_minute' => $lastMinute,
    'manual_contact' => $manualContact,
    'counts_toward_capacity' => false,
];

if ($dryRunRequested) {
    respond_json(200, [
        'ok' => true,
        'dry_run' => true,
        'stored' => false,
        'message' => INQUIRY_CONFIRMATION,
        'departure_check' => $departureCheck,
        'manual_review' => $manualReview !== null,
        'last_minute' => $lastMinute,
        'last_minute_forced' => $lastMinuteForced,
        'manual_contact' => $manualContact,
        'flow' => $flow,
        'classification' => $classification,
        'subject' => $subject,
        'body' => $body,
        'entity' => [
            'type' => $entityType,
            'code' => $entityCode,
            'slug' => $entitySlug,
            'name' => $entityName,
            'product_class' => $productClass,
        ],
    ]);
}

$route = in_array($flow, ['general'], true) ? 'general' : 'reservations';
$to = $route === 'general' ? INQUIRY_TO : RESERVATIONS_TO;
$replyTo = ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) && !preg_match('/[\r\n,;<>"]/', $email)) ? $email : '';
$inquiryRecord['source'] = 'website-form';
$inquiryRecord['route'] = $route;

// 1) Durable record FIRST (private folder) with a collision-safe AT-YYYY-NNNNN reference.
$stored = null;
$mailLibOk = $bookingAvailable && is_file(__DIR__ . '/booking/lib/inquiry-mail.php');
if ($mailLibOk) {
    require_once __DIR__ . '/booking/lib/inquiry-mail.php';
    try {
        $ipHash = hash('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? '') . '|afghantours-rl');
        $stored = aim_store_new($inquiryRecord, $ipHash);
    } catch (Throwable $e) {
        error_log('[afghantours inquiry] store failed: ' . $e->getMessage());
        $stored = null;
    }
}
if ($stored !== null && $stored['rate_limited']) {
    $msg = 'Too many requests were sent from your connection in a short time. Please wait a few minutes, or contact us on WhatsApp +93 780 123 456.';
    if (wants_json()) {
        respond_json(429, ['ok' => false, 'message' => $msg]);
    }
    respond_html_error(429, $msg);
}

$reference = null;
if ($stored !== null && $stored['record'] !== null) {
    $reference = (string)$stored['record']['id'];
    if (!$stored['duplicate']) {
        // 2) Internal notification (To primary, leadership per private config, Reply-To visitor), then 3) ack — both status-tracked.
        // A failure leaves the record flagged for the cron retry queue and the /manage/ failure view; nothing is discarded.
        aim_deliver($reference, $body . "\n\nAdmin reference: " . $reference, $subject);
    }
    $sent = true;
} else {
    // Private store unavailable: legacy email-only path. Success only if the email was actually accepted.
    $headers = [
        'From: ' . INQUIRY_FROM,
        'Content-Type: text/plain; charset=UTF-8',
        'Auto-Submitted: auto-generated',
        'X-Auto-Response-Suppress: All',
    ];
    if ($replyTo !== '') {
        $headers[] = 'Reply-To: ' . $replyTo;
    }
    $sent = @mail($to, $subject, $body, implode("\r\n", $headers));
}

if (!$sent) {
    $msg = 'Your inquiry could not be sent from the server. Please contact ' . $to . ' or WhatsApp the Kabul team on +93 780 123 456.';
    if (wants_json()) {
        respond_json(500, ['ok' => false, 'message' => $msg]);
    }
    respond_html_error(500, $msg);
}

if (wants_json()) {
    respond_json(200, [
        'ok' => true,
        'message' => INQUIRY_CONFIRMATION,
        'reference' => $reference,
        'flow' => $flow,
        'classification' => $classification,
    ]);
}

$returnHref = match ($flow) {
    'activity' => '/activities/',
    'specialist' => '/specialist-services/',
    'return' => '/return-journeys/',
    'custom' => '/custom-requests/',
    'scheduled', 'private-fixed' => '/tours/',
    default => '/contact/',
};
$returnLabel = match ($flow) {
    'activity' => 'Return to activities',
    'specialist' => 'Return to specialist services',
    'return' => 'Return to return journeys',
    'custom' => 'Return to custom requests',
    'scheduled', 'private-fixed' => 'Return to tours',
    default => 'Return to contact',
};
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Inquiry received | AfghanTours</title>
  <style>
    body{margin:0;background:#0e1815;color:#fff;font:16px/1.6 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;padding:2rem}
    main{max-width:640px;background:#fffdf8;color:#101820;padding:2rem;border-radius:24px;text-align:center}
    a{display:inline-block;margin-top:1rem;background:#0e1815;color:#fff;text-decoration:none;padding:.75rem 1rem;border-radius:999px;font-weight:800}
  </style>
</head>
<body>
  <main>
    <h1>Thank you.</h1>
    <p><?= htmlspecialchars(INQUIRY_CONFIRMATION, ENT_QUOTES, 'UTF-8') ?></p>
<?php if ($reference !== null): ?>    <p>Your inquiry reference: <strong><?= htmlspecialchars($reference, ENT_QUOTES, 'UTF-8') ?></strong></p>
<?php endif; ?>
    <a href="<?= htmlspecialchars($returnHref, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($returnLabel, ENT_QUOTES, 'UTF-8') ?></a>
  </main>
</body>
</html>
