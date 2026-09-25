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
const MAX_NAME = 120;
const MAX_EMAIL = 190;
const MAX_WHATSAPP = 40;
const MAX_SUBJECT_ENTITY = 160;
const MAX_FIELD = 500;
const MAX_NOTES = 4000;
const MAX_URL = 500;

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

if ($dryRunRequested) {
    respond_json(200, [
        'ok' => true,
        'dry_run' => true,
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

$to = INQUIRY_TO;
$headers = [
    'From: ' . INQUIRY_FROM,
    'Content-Type: text/plain; charset=UTF-8',
];
if ($email !== '') {
    $headers[] = 'Reply-To: ' . $email;
}

$sent = @mail($to, $subject, $body, implode("\r\n", $headers));

if (!$sent) {
    $msg = 'Your inquiry could not be sent from the server. Please contact info@afghantours.com or WhatsApp the Kabul team.';
    if (wants_json()) {
        respond_json(500, ['ok' => false, 'message' => $msg]);
    }
    respond_html_error(500, $msg);
}

if (wants_json()) {
    respond_json(200, [
        'ok' => true,
        'message' => 'Inquiry sent.',
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
    <p>Your inquiry has been sent to AfghanTours. We will reply using the contact information you provided.</p>
    <a href="<?= htmlspecialchars($returnHref, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($returnLabel, ENT_QUOTES, 'UTF-8') ?></a>
  </main>
</body>
</html>
