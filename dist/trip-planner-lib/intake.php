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

function atp_new_reference(): string
{
    return 'AT-TP-' . gmdate('Ymd') . '-' . bin2hex(random_bytes(4));
}

function atp_store_lead(array $config, array $submission): array
{
    $reference = atp_new_reference();
    if (!preg_match('/^AT-TP-(\d{4})(\d{2})\d{2}-[a-f0-9]{8}$/', $reference, $parts)) {
        return ['ok' => false];
    }
    $dir = $config['data_root'] . '/intake/' . $parts[1] . '/' . $parts[2];
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
        return ['ok' => false];
    }
    $path = $dir . '/' . $reference . '.json';
    if (is_file($path)) {
        return ['ok' => false];
    }
    $record = [
        'schema_version' => 1,
        'reference' => $reference,
        'received_at' => gmdate('c'),
        'status' => 'received',
        'source' => 'public-trip-planner',
        'submission' => $submission,
        'client' => [
            'ip_hash' => atp_ip_hash($config),
            'user_agent' => atp_client_agent(),
        ],
    ];
    $json = json_encode($record, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return ['ok' => false];
    }
    $tmp = $path . '.tmp';
    if (file_put_contents($tmp, $json . "\n", LOCK_EX) === false) {
        return ['ok' => false];
    }
    chmod($tmp, 0640);
    if (!rename($tmp, $path)) {
        @unlink($tmp);
        return ['ok' => false];
    }
    return ['ok' => true, 'reference' => $reference];
}

function atp_lead_path(string $dataRoot, string $reference): ?string
{
    if (!preg_match('/^AT-TP-(\d{4})(\d{2})\d{2}-[a-f0-9]{8}$/', $reference, $parts)) {
        return null;
    }
    $intake = realpath($dataRoot . '/intake');
    if ($intake === false) {
        return null;
    }
    $path = $intake . DIRECTORY_SEPARATOR . $parts[1] . DIRECTORY_SEPARATOR . $parts[2] . DIRECTORY_SEPARATOR . $reference . '.json';
    $real = realpath($path);
    if ($real === false || !str_starts_with($real, $intake . DIRECTORY_SEPARATOR) || !is_file($real)) {
        return null;
    }
    return $real;
}

function atp_list_leads(string $dataRoot, int $limit = 30): array
{
    $intake = $dataRoot . '/intake';
    $files = glob($intake . '/*/*/*.json') ?: [];
    $leads = [];
    foreach ($files as $file) {
        if (!is_string($file) || !is_file($file)) {
            continue;
        }
        $decoded = json_decode((string)file_get_contents($file), true);
        if (!is_array($decoded)) {
            continue;
        }
        $reference = (string)($decoded['reference'] ?? '');
        if (preg_match('/^AT-TP-\d{8}-[a-f0-9]{8}$/', $reference) !== 1) {
            continue;
        }
        $submission = is_array($decoded['submission'] ?? null) ? $decoded['submission'] : [];
        $contact = is_array($submission['contact'] ?? null) ? $submission['contact'] : [];
        $dates = is_array($submission['dates'] ?? null) ? $submission['dates'] : [];
        $leads[] = [
            'reference' => $reference,
            'received_at' => is_string($decoded['received_at'] ?? null) ? $decoded['received_at'] : '',
            'name' => is_string($contact['name'] ?? null) ? $contact['name'] : '',
            'duration_days' => is_int($dates['duration_days'] ?? null) ? $dates['duration_days'] : null,
            'date_mode' => is_string($dates['mode'] ?? null) ? $dates['mode'] : '',
        ];
    }
    usort($leads, static fn (array $a, array $b): int => strcmp($b['received_at'], $a['received_at']));
    return ['count' => count($leads), 'leads' => array_slice($leads, 0, $limit)];
}

function atp_public_lead(string $dataRoot, string $reference): ?array
{
    $path = atp_lead_path($dataRoot, $reference);
    if ($path === null) {
        return null;
    }
    $decoded = json_decode((string)file_get_contents($path), true);
    if (!is_array($decoded) || !is_array($decoded['submission'] ?? null)) {
        return null;
    }
    return [
        'reference' => $reference,
        'received_at' => is_string($decoded['received_at'] ?? null) ? $decoded['received_at'] : '',
        'status' => 'received',
        'submission' => $decoded['submission'],
    ];
}
