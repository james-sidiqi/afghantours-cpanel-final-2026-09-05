<?php
declare(strict_types=1);

/**
 * Unified AfghanTours inquiry handler.
 * Supports flows: scheduled | private-fixed | custom | activity | specialist | return | general
 * Backward-compatible with legacy tour modal fields (tour / tour_name / tour_slug / travelers / group_size).
 *
 * Dry-run: POST dry_run=1 (or Accept: application/json with X-AfghanTours-Dry-Run: 1)
 * returns JSON { ok, subject, classification, body, flow } without calling mail().
 */

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

function wants_json(): bool {
    $accept = (string)($_SERVER['HTTP_ACCEPT'] ?? '');
    return str_contains($accept, 'application/json')
        || field('format') === 'json'
        || field('ajax') === '1';
}

function is_dry_run(): bool {
    if (field('dry_run') === '1' || field('dry_run') === 'true') {
        return true;
    }
    $header = (string)($_SERVER['HTTP_X_AFGHANTOURS_DRY_RUN'] ?? '');
    return $header === '1' || strcasecmp($header, 'true') === 0;
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
    if (wants_json() || is_dry_run()) {
        respond_json(204, ['ok' => true, 'message' => 'Ignored']);
    }
    http_response_code(204);
    exit;
}

$name = field('name');
$email = field('email');
$whatsapp = first_nonempty('whatsapp', 'phone', 'tel');
$contactCombined = field('contact'); // legacy contact page single field

if ($email === '' && $whatsapp === '' && $contactCombined !== '') {
    if (filter_var($contactCombined, FILTER_VALIDATE_EMAIL)) {
        $email = $contactCombined;
    } else {
        $whatsapp = $contactCombined;
    }
}

$entityName = first_nonempty('entity_name', 'tour_name', 'tour', 'service_name', 'journey_name', 'activity_name', 'interest');
$entitySlug = first_nonempty('entity_slug', 'tour_slug', 'service', 'service_slug', 'journey', 'journey_slug', 'activity', 'activity_slug');
$entityCode = first_nonempty('entity_code', 'tour_code', 'service_code', 'journey_code', 'activity_code');
$entityType = first_nonempty('entity_type', 'product_type');
$productClass = first_nonempty('product_class', 'tour_class');
$typeHint = first_nonempty('type', 'inquiry_type');
$flow = normalize_flow(field('flow'), $entityType, $productClass, $typeHint);

$sourceUrl = first_nonempty('source_url', 'page_url', 'tour_url');
$preferredDates = first_nonempty('preferred_dates', 'travel_dates', 'dates');
$travelers = first_nonempty('travelers', 'group_size');
$preferredHub = first_nonempty('preferred_hub', 'hub');
$accommodation = field('accommodation');
$transport = field('transport');
$activities = field('activities');
$culturalInterests = field('cultural_interests');
$experienceLevel = field('experience_level');
$availableTime = field('available_time');
$notes = first_nonempty('notes', 'message');
$country = field('country');
$interest = field('interest');

if ($name === '') {
    $msg = 'Please provide your name.';
    if (wants_json() || is_dry_run()) {
        respond_json(400, ['ok' => false, 'message' => $msg]);
    }
    respond_html_error(400, $msg);
}

if ($email === '' && $whatsapp === '') {
    $msg = 'Please provide an email address or WhatsApp number.';
    if (wants_json() || is_dry_run()) {
        respond_json(400, ['ok' => false, 'message' => $msg]);
    }
    respond_html_error(400, $msg);
}

if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $msg = 'Please provide a valid email address, or leave email blank and use WhatsApp.';
    if (wants_json() || is_dry_run()) {
        respond_json(400, ['ok' => false, 'message' => $msg]);
    }
    respond_html_error(400, $msg);
}

// Tour flows: require an entity name/slug so staff know which tour.
// Non-tour flows must NOT require tour_code / tour_name.
if (is_tour_flow($flow) && $entityName === '' && $entitySlug === '') {
    $msg = 'Please indicate which tour you are inquiring about.';
    if (wants_json() || is_dry_run()) {
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
$subject = 'AfghanTours ' . $classification . ': ' . $displayName;

$lines = [
    'New AfghanTours inquiry',
    '',
    'Classification: ' . $classification,
    'Flow: ' . $flow,
    'Entity type: ' . $entityType,
    'Entity name: ' . ($entityName !== '' ? $entityName : '(none)'),
    'Entity slug: ' . ($entitySlug !== '' ? $entitySlug : '(none)'),
    'Entity code: ' . ($entityCode !== '' ? $entityCode : '(none)'),
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

if (is_dry_run()) {
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
        ],
    ]);
}

$to = 'info@afghantours.com';
$headers = [
    'From: AfghanTours Website <info@afghantours.com>',
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
