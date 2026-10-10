<?php
declare(strict_types=1);
// PHP mirror of core.test.mjs — same fixtures, so JS (build snapshot) and PHP (runtime) agree.
require __DIR__ . '/../../public/booking/lib/booking.php';
$fx = json_decode((string)file_get_contents(__DIR__ . '/fixtures.json'), true);
$fail = 0; $pass = 0;
$ok = function (bool $c, string $name) use (&$fail, &$pass) { if ($c) { $pass++; } else { $fail++; fwrite(STDERR, "FAIL: $name\n"); } };
foreach ($fx['cases'] as $c) {
    $st = atb_compute_status($c['dep'], $c['today'], $fx['settings']);
    $ok($st['key'] === $c['expect'], "status {$c['name']} → {$st['key']} (want {$c['expect']})");
    if (array_key_exists('expect_public', $c)) $ok(atb_is_public($c['dep'], $c['today']) === $c['expect_public'], "public {$c['name']}");
}
foreach ($fx['group_minimum'] as $g) $ok(atb_group_minimum_note($g['travelers'], $g['type'], 3) === $g['expect'], "group {$g['travelers']} {$g['type']}");
foreach ($fx['dates'] as $d) {
    $ok(atb_expected_end($d['start'], $d['days']) === $d['end'], "end {$d['start']}+{$d['days']}");
    $ok(atb_inclusive_days($d['start'], $d['end']) === $d['days'], "days {$d['start']}");
}
foreach ($fx['prices'] as $p) $ok(atb_price_label($p['price'], ['usd_confirmed' => $p['usd_confirmed']]) === $p['expect'], "price {$p['expect']}");
$ok(atb_format_range('2026-12-05', '2026-12-16') === 'Sat 5 Dec – Wed 16 Dec 2026', 'format range');
$pub = atb_public_departure(['id' => 'X', 'tour_slug' => 's', 'status' => 'scheduled', 'published' => true, 'start_date' => '2026-12-05', 'end_date' => '2026-12-16', 'duration_days' => 12, 'min_group_size' => 3, 'max_capacity' => 8, 'confirmed_count' => 2, 'internal_notes' => 'secret', 'operational_approval' => 'approved', 'price' => ['amount' => 2100, 'price_status' => 'reference_from_production']], null, [], '2026-10-10');
foreach (['internal_notes', 'operational_approval', 'confirmed_count', 'pending_count', 'max_capacity', 'travelers'] as $k) $ok(!array_key_exists($k, $pub), "no $k in public");
$ok(!str_contains(json_encode($pub), 'secret'), 'no secret');
$ok($pub['status_text'] === 'Awaiting group confirmation — minimum 3 travelers.', 'awaiting wording');
$ok($pub['cta'] === 'Request a Place', 'cta');
$ok($pub['price_label'] === 'From $2,100 per person', 'price label');

// JS parity: the snapshot labels the build produced must equal PHP output for the seed.
$seed = json_decode((string)file_get_contents(__DIR__ . '/../../data/booking/departures.json'), true)['departures'];
$settings = json_decode((string)file_get_contents(__DIR__ . '/../../data/booking/settings.json'), true);
$parity = __DIR__ . '/.parity.json';
if (is_file($parity)) {
    $js = json_decode((string)file_get_contents($parity), true);
    foreach ($seed as $d) {
        $p = atb_public_departure($d, null, $settings, $js['today']);
        $j = $js['rows'][$d['id']] ?? null;
        $ok($j !== null && $j['status'] === $p['status'] && $j['date_label'] === $p['date_label'] && $j['price_label'] === $p['price_label'] && $j['status_text'] === $p['status_text'] && $j['cta'] === $p['cta'], "parity {$d['id']}");
    }
}
echo "PHP core tests: $pass passed, $fail failed\n";
exit($fail ? 1 : 0);
