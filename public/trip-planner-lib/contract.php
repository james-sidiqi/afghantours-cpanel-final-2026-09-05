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

const ATP_FORBIDDEN_KEYS = [
    'low_afn', 'medium_afn', 'high_afn', 'supplier', 'supplier_contact', 'margin', 'markup',
    'gross_margin', 'price', 'price_from', 'nightly_cost', 'nightly_cost_usd', 'nightly_sell',
    'nightly_sell_price_usd', 'fx', 'rate_id', 'password', 'password_hash', 'cost',
    'costing_eligible', 'source_name', 'verification_status',
];

function atp_forbidden_keys(array $value): bool
{
    foreach ($value as $key => $child) {
        if (is_string($key) && in_array(strtolower($key), ATP_FORBIDDEN_KEYS, true)) {
            return true;
        }
        if (is_array($child) && atp_forbidden_keys($child)) {
            return true;
        }
    }
    return false;
}

function atp_only_keys(array $value, array $allowed): bool
{
    foreach (array_keys($value) as $key) {
        if (!is_string($key) || !in_array($key, $allowed, true)) {
            return false;
        }
    }
    return true;
}

function atp_line(mixed $value, int $max, bool $allowEmpty = true, bool $multiline = false): ?string
{
    if (!is_string($value) && !is_int($value)) {
        return null;
    }
    $text = trim((string)$value);
    if (preg_match('//u', $text) !== 1) {
        return null;
    }
    if (preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $text)) {
        return null;
    }
    if (!$multiline && preg_match('/[\r\n]/', $text)) {
        return null;
    }
    if (strlen($text) > ($max * 4)) {
        return null;
    }
    $chars = preg_match_all('/./u', $text);
    if ($chars === false || $chars > $max) {
        return null;
    }
    if (!$allowEmpty && $text === '') {
        return null;
    }
    return $text;
}

function atp_int(mixed $value, int $min, int $max): ?int
{
    if (is_int($value)) {
        $number = $value;
    } elseif (is_string($value) && preg_match('/^\d+$/', $value)) {
        $number = (int)$value;
    } else {
        return null;
    }
    if ($number < $min || $number > $max) {
        return null;
    }
    return $number;
}

function atp_date(mixed $value, bool $required): ?string
{
    if ($value === null || $value === '') {
        return $required ? null : '';
    }
    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
        return null;
    }
    [$year, $month, $day] = array_map('intval', explode('-', $value));
    if (!checkdate($month, $day, $year)) {
        return null;
    }
    return $value;
}

function atp_codes(mixed $value, int $max): ?array
{
    if ($value === null || $value === '' || $value === []) {
        return [];
    }
    if (is_string($value)) {
        $value = array_map('trim', explode(',', $value));
    }
    if (!is_array($value) || !array_is_list($value) || count($value) > $max) {
        return null;
    }
    $out = [];
    foreach ($value as $item) {
        if (!is_string($item) && !is_int($item)) {
            return null;
        }
        $code = trim((string)$item);
        if ($code === '') {
            continue;
        }
        if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]{0,15}$/', $code)) {
            return null;
        }
        $out[$code] = $code;
    }
    return array_values($out);
}

function atp_interests(mixed $value): ?array
{
    if ($value === null || $value === '' || $value === []) {
        return [];
    }
    if (is_string($value)) {
        $value = array_map('trim', explode(',', $value));
    }
    if (!is_array($value) || !array_is_list($value) || count($value) > 12) {
        return null;
    }
    $out = [];
    foreach ($value as $item) {
        $line = atp_line($item, 40, false);
        if ($line === null) {
            return null;
        }
        $out[] = $line;
    }
    return $out;
}

function atp_clean_days(mixed $days): ?array
{
    if ($days === null || $days === '' || $days === []) {
        return [];
    }
    if (!is_array($days) || count($days) > 40) {
        return null;
    }
    $isList = array_is_list($days);
    $out = [];
    $seen = [];
    foreach ($days as $key => $day) {
        if (!is_array($day) || !atp_only_keys($day, ['day_number', 'overnight_hub', 'travel_mode', 'notes', 'province_codes', 'attraction_codes'])) {
            return null;
        }
        $hub = atp_line($day['overnight_hub'] ?? '', 80);
        $mode = atp_line($day['travel_mode'] ?? '', 20);
        $notes = atp_line($day['notes'] ?? '', 500, true, true);
        $provinces = atp_codes($day['province_codes'] ?? [], 34);
        $attractions = atp_codes($day['attraction_codes'] ?? [], 40);
        if ($hub === null || $mode === null || $notes === null || $provinces === null || $attractions === null) {
            return null;
        }
        if ($hub === '' && $mode === '' && $notes === '' && $provinces === [] && $attractions === []) {
            continue;
        }
        if (array_key_exists('day_number', $day)) {
            $number = atp_int($day['day_number'], 1, 40);
        } elseif (!$isList) {
            $number = atp_int((string)$key, 1, 40);
        } else {
            return null;
        }
        if ($number === null || isset($seen[$number])) {
            return null;
        }
        if ($mode !== '' && !in_array($mode, ['ground', 'flight', 'undecided', 'none'], true)) {
            return null;
        }
        $seen[$number] = true;
        $clean = ['day_number' => $number];
        if ($hub !== '') {
            $clean['overnight_hub'] = $hub;
        }
        if ($mode !== '') {
            $clean['travel_mode'] = $mode;
        }
        if ($notes !== '') {
            $clean['notes'] = $notes;
        }
        if ($provinces !== []) {
            $clean['province_codes'] = $provinces;
        }
        if ($attractions !== []) {
            $clean['attraction_codes'] = $attractions;
        }
        $out[] = $clean;
    }
    usort($out, static fn (array $a, array $b): int => $a['day_number'] <=> $b['day_number']);
    return $out;
}

function atp_validate_submission(array $src, string $mode): array
{
    if (atp_forbidden_keys($src)) {
        return ['ok' => false, 'errors' => ['rejected_field']];
    }
    if ($mode === 'json') {
        if (!atp_only_keys($src, [
            'schema_version', 'contact', 'party', 'dates', 'interests', 'province_codes', 'pace',
            'travel_style', 'accommodation_tier', 'activity_codes', 'hotel_ids', 'attraction_codes',
            'tour_code', 'budget_note', 'notes', 'days', 'company_website',
        ])) {
            return ['ok' => false, 'errors' => ['unexpected_field']];
        }
        $contact = is_array($src['contact'] ?? null) ? $src['contact'] : null;
        $party = is_array($src['party'] ?? null) ? $src['party'] : null;
        $dates = is_array($src['dates'] ?? null) ? $src['dates'] : null;
        if ($contact === null || $party === null || $dates === null) {
            return ['ok' => false, 'errors' => ['missing_section']];
        }
        if (!atp_only_keys($contact, ['name', 'email', 'phone', 'preferred_contact', 'language'])
            || !atp_only_keys($party, ['adults', 'children', 'rooms'])
            || !atp_only_keys($dates, ['mode', 'start', 'end', 'flexible_note', 'duration_days'])) {
            return ['ok' => false, 'errors' => ['unexpected_field']];
        }
        $flat = [
            'schema_version' => $src['schema_version'] ?? null,
            'contact_name' => $contact['name'] ?? '',
            'contact_email' => $contact['email'] ?? '',
            'contact_phone' => $contact['phone'] ?? '',
            'preferred_contact' => $contact['preferred_contact'] ?? '',
            'language' => $contact['language'] ?? '',
            'adults' => $party['adults'] ?? null,
            'children' => $party['children'] ?? null,
            'rooms' => $party['rooms'] ?? null,
            'date_mode' => $dates['mode'] ?? '',
            'date_start' => $dates['start'] ?? '',
            'date_end' => $dates['end'] ?? '',
            'flexible_note' => $dates['flexible_note'] ?? '',
            'duration_days' => $dates['duration_days'] ?? null,
            'interests' => $src['interests'] ?? [],
            'province_codes' => $src['province_codes'] ?? [],
            'pace' => $src['pace'] ?? '',
            'travel_style' => $src['travel_style'] ?? '',
            'accommodation_tier' => $src['accommodation_tier'] ?? '',
            'activity_codes' => $src['activity_codes'] ?? [],
            'hotel_ids' => $src['hotel_ids'] ?? [],
            'attraction_codes' => $src['attraction_codes'] ?? [],
            'tour_code' => $src['tour_code'] ?? '',
            'budget_note' => $src['budget_note'] ?? '',
            'notes' => $src['notes'] ?? '',
            'days' => $src['days'] ?? [],
            'company_website' => $src['company_website'] ?? '',
        ];
    } else {
        if (!atp_only_keys($src, [
            'schema_version', 'contact_name', 'contact_email', 'contact_phone', 'preferred_contact',
            'language', 'adults', 'children', 'rooms', 'date_mode', 'date_start', 'date_end',
            'flexible_note', 'duration_days', 'interests', 'province_codes', 'pace', 'travel_style',
            'accommodation_tier', 'activity_codes', 'hotel_ids', 'attraction_codes', 'tour_code',
            'budget_note', 'notes', 'days', 'company_website',
        ])) {
            return ['ok' => false, 'errors' => ['unexpected_field']];
        }
        $flat = $src;
    }

    $errors = [];
    $version = atp_int($flat['schema_version'] ?? null, 1, 1);
    if ($version !== 1) {
        $errors[] = 'schema_version';
    }
    $name = atp_line($flat['contact_name'] ?? '', 120, false);
    $email = atp_line($flat['contact_email'] ?? '', 120, false);
    $phone = atp_line($flat['contact_phone'] ?? '', 40);
    $language = atp_line($flat['language'] ?? '', 40);
    $preferred = atp_line($flat['preferred_contact'] ?? '', 20, false);
    $adults = atp_int($flat['adults'] ?? null, 1, 30);
    $children = atp_int($flat['children'] ?? null, 0, 20);
    $rooms = atp_int($flat['rooms'] ?? null, 1, 20);
    $dateMode = atp_line($flat['date_mode'] ?? '', 20, false);
    $start = atp_date($flat['date_start'] ?? '', false);
    $end = atp_date($flat['date_end'] ?? '', false);
    $flexible = atp_line($flat['flexible_note'] ?? '', 200, true, true);
    $duration = atp_int($flat['duration_days'] ?? null, 1, 40);
    $interests = atp_interests($flat['interests'] ?? []);
    $provinces = atp_codes($flat['province_codes'] ?? [], 34);
    $pace = atp_line($flat['pace'] ?? '', 20, false);
    $travel = atp_line($flat['travel_style'] ?? '', 20, false);
    $tier = atp_line($flat['accommodation_tier'] ?? '', 20, false);
    $activities = atp_codes($flat['activity_codes'] ?? [], 20);
    $hotels = atp_codes($flat['hotel_ids'] ?? [], 21);
    $attractions = atp_codes($flat['attraction_codes'] ?? [], 40);
    $tour = atp_line($flat['tour_code'] ?? '', 16);
    $budget = atp_line($flat['budget_note'] ?? '', 200, true, true);
    $notes = atp_line($flat['notes'] ?? '', 2000, true, true);
    $days = atp_clean_days($flat['days'] ?? []);
    $honeypot = atp_line($flat['company_website'] ?? '', 200);
    if ($name === null) {
        $errors[] = 'name';
    }
    if ($email === null || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
        $errors[] = 'email';
    }
    if ($phone === null || ($phone !== '' && !preg_match('/^[0-9+(). \\-]{1,40}$/', $phone))) {
        $errors[] = 'phone';
    }
    if ($language === null || $preferred === null || !in_array($preferred, ['email', 'phone', 'whatsapp'], true)) {
        $errors[] = 'contact';
    }
    if ($adults === null || $children === null || $rooms === null) {
        $errors[] = 'party';
    }
    if ($dateMode === null || !in_array($dateMode, ['fixed', 'flexible'], true) || $start === null || $end === null || $flexible === null || $duration === null) {
        $errors[] = 'dates';
    }
    if ($dateMode === 'fixed' && $start === '') {
        $errors[] = 'dates';
    }
    if ($dateMode === 'flexible' && $flexible === '') {
        $errors[] = 'dates';
    }
    if ($start !== null && $end !== null && $start !== '' && $end !== '' && $end < $start) {
        $errors[] = 'dates';
    }
    if ($interests === null || $provinces === null || $activities === null || $hotels === null || $attractions === null || $days === null) {
        $errors[] = 'selection';
    }
    if ($pace === null || !in_array($pace, ['relaxed', 'moderate', 'full'], true)) {
        $errors[] = 'pace';
    }
    if ($travel === null || !in_array($travel, ['ground', 'mixed', 'undecided'], true)) {
        $errors[] = 'travel_style';
    }
    if ($tier === null || !in_array($tier, ['simple', 'comfortable', 'undecided'], true)) {
        $errors[] = 'accommodation_tier';
    }
    if ($tour === null || ($tour !== '' && !preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]{0,15}$/', $tour))) {
        $errors[] = 'tour_code';
    }
    if ($budget === null || $notes === null || $honeypot === null) {
        $errors[] = 'notes';
    }
    if ($errors !== []) {
        return ['ok' => false, 'errors' => array_values(array_unique($errors))];
    }
    $submission = [
        'schema_version' => 1,
        'contact' => [
            'name' => $name,
            'email' => $email,
            'preferred_contact' => $preferred,
        ],
        'party' => ['adults' => $adults, 'children' => $children, 'rooms' => $rooms],
        'dates' => ['mode' => $dateMode, 'duration_days' => $duration],
        'interests' => $interests,
        'province_codes' => $provinces,
        'pace' => $pace,
        'travel_style' => $travel,
        'accommodation_tier' => $tier,
        'activity_codes' => $activities,
        'hotel_ids' => $hotels,
        'attraction_codes' => $attractions,
        'days' => $days,
    ];
    if ($phone !== '') {
        $submission['contact']['phone'] = $phone;
    }
    if ($language !== '') {
        $submission['contact']['language'] = $language;
    }
    if ($start !== '') {
        $submission['dates']['start'] = $start;
    }
    if ($end !== '') {
        $submission['dates']['end'] = $end;
    }
    if ($flexible !== '') {
        $submission['dates']['flexible_note'] = $flexible;
    }
    if ($tour !== '') {
        $submission['tour_code'] = $tour;
    }
    if ($budget !== '') {
        $submission['budget_note'] = $budget;
    }
    if ($notes !== '') {
        $submission['notes'] = $notes;
    }
    return ['ok' => true, 'errors' => [], 'submission' => $submission, 'honeypot' => $honeypot];
}
