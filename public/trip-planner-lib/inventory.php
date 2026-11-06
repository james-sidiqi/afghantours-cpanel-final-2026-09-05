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

function atp_archive_dir(string $dataRoot): ?string
{
    $names = ['archive'];
    $manifestPath = $dataRoot . '/source-inventory.json';
    if (is_file($manifestPath)) {
        $manifest = json_decode((string)file_get_contents($manifestPath), true);
        $dirname = is_array($manifest) ? ($manifest['archive_dirname'] ?? '') : '';
        if (is_string($dirname) && preg_match('/^[A-Za-z0-9_-]+$/', $dirname) === 1) {
            array_unshift($names, $dirname);
        }
    }
    $seen = [];
    foreach ($names as $name) {
        if (isset($seen[$name])) {
            continue;
        }
        $seen[$name] = true;
        $path = $dataRoot . DIRECTORY_SEPARATOR . $name;
        if (is_dir($path)) {
            $real = realpath($path);
            return $real === false ? null : $real;
        }
    }
    return null;
}

function atp_safe_relative(string $relative): ?string
{
    $relative = str_replace('\\', '/', $relative);
    if ($relative === '' || str_contains($relative, "\0") || str_starts_with($relative, '/') || preg_match('#(^|/)\.\.(/|$)#', $relative)) {
        return null;
    }
    return $relative;
}

function atp_csv_row_count(string $path): ?int
{
    $handle = fopen($path, 'rb');
    if ($handle === false) {
        return null;
    }
    $count = 0;
    $header = true;
    try {
        while (($row = fgetcsv($handle)) !== false) {
            if ($header) {
                $header = false;
                continue;
            }
            if ($row === [null] || $row === []) {
                continue;
            }
            $count++;
        }
    } finally {
        fclose($handle);
    }
    return $count;
}

function atp_inventory_report(array $config): array
{
    $manifestPath = $config['data_root'] . '/source-inventory.json';
    if (!is_file($manifestPath)) {
        return ['ok' => false, 'error' => 'manifest_missing', 'counts' => [], 'files' => []];
    }
    $manifest = json_decode((string)file_get_contents($manifestPath), true);
    if (!is_array($manifest) || (int)($manifest['schema_version'] ?? 0) !== 1 || !is_array($manifest['files'] ?? null)) {
        return ['ok' => false, 'error' => 'manifest_invalid', 'counts' => [], 'files' => []];
    }
    $archive = atp_archive_dir($config['data_root']);
    $archiveReal = $archive === null ? null : realpath($archive);
    $rows = [];
    foreach ($manifest['files'] as $item) {
        if (!is_array($item)) {
            $rows[] = ['path' => '', 'status' => 'invalid'];
            continue;
        }
        $relative = atp_safe_relative((string)($item['path'] ?? ''));
        if ($relative === null) {
            $rows[] = ['path' => '', 'status' => 'invalid'];
            continue;
        }
        $expectedSha = strtolower((string)($item['sha256'] ?? ''));
        $expectedRows = array_key_exists('rows', $item) ? (int)$item['rows'] : null;
        $record = [
            'path' => $relative,
            'role' => is_string($item['role'] ?? null) ? $item['role'] : '',
            'expected_rows' => $expectedRows,
            'actual_rows' => null,
            'status' => 'missing',
        ];
        if ($archiveReal === null) {
            $rows[] = $record;
            continue;
        }
        $full = $archiveReal . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);
        $real = realpath($full);
        if ($real === false || !str_starts_with($real, $archiveReal . DIRECTORY_SEPARATOR) || !is_file($real)) {
            $rows[] = $record;
            continue;
        }
        $size = filesize($real);
        if ($size === false || $size > 20000000) {
            $record['status'] = 'too_large';
            $rows[] = $record;
            continue;
        }
        $actualSha = hash_file('sha256', $real);
        $actualRows = str_ends_with(strtolower($relative), '.csv') ? atp_csv_row_count($real) : null;
        $record['actual_rows'] = $actualRows;
        $hashOk = is_string($actualSha) && hash_equals($expectedSha, $actualSha);
        $rowsOk = $expectedRows === null || $actualRows === $expectedRows;
        $record['status'] = ($hashOk && $rowsOk) ? 'match' : 'mismatch';
        $rows[] = $record;
    }
    $counts = [];
    foreach (($manifest['counts'] ?? []) as $key => $value) {
        if (is_string($key) && is_int($value)) {
            $counts[$key] = $value;
        }
    }
    return [
        'ok' => true,
        'error' => $archiveReal === null ? 'archive_missing' : null,
        'counts' => $counts,
        'files' => $rows,
    ];
}
