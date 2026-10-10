<?php
declare(strict_types=1);
// PHP mirror of core.test.mjs — same fixtures, so JS (build snapshot) and PHP (runtime) agree.
require __DIR__ . '/../../public/booking/lib/booking.php';
$fx = json_decode((string)file_get_contents(__DIR__ . '/fixtures.json'), true);
$fail = 0; $pass = 0;
$ok = function (bool $c, string $name) use (&$fail, &$pass) { if ($c) { $pass++; } else { $fail++; fwrite(STDERR, "FAIL: $name\n"); } };
foreach ($fx['cases'] as $c) {
    $st = atb_compute_status($c['dep'], $c['today'], array_replace($fx['settings'], $c['settings'] ?? []));
    $ok($st['key'] === $c['expect'], "status {$c['name']} → {$st['key']} (want {$c['expect']})");
    if (array_key_exists('expect_public', $c)) $ok(atb_is_public($c['dep'], $c['today']) === $c['expect_public'], "public {$c['name']}");
}
foreach ($fx['group_minimum'] as $g) $ok(atb_group_minimum_note($g['travelers'], $g['type'], $g['min']) === $g['expect'], "group ({$g['label']}) {$g['travelers']} {$g['type']}");
foreach ($fx['group_rule'] as $r) $ok(atb_group_rule($r['days'], $fx['settings']) === ['applies' => $r['applies'], 'min' => $r['min'], 'max' => $r['max']], "group rule {$r['days']} days");
foreach ($fx['status_text'] as $t) $ok(atb_status_text('open', ['min_group_size' => $t['min']]) === $t['expect'], "status wording min {$t['min']}");
foreach ($fx['dates'] as $d) {
    $ok(atb_expected_end($d['start'], $d['days']) === $d['end'], "end {$d['start']}+{$d['days']}");
    $ok(atb_inclusive_days($d['start'], $d['end']) === $d['days'], "days {$d['start']}");
}
foreach ($fx['prices'] as $p) $ok(atb_price_label($p['price'], ['usd_confirmed' => $p['usd_confirmed']]) === $p['expect'], "price {$p['expect']}");
$ok(atb_format_range('2026-12-05', '2026-12-16') === 'Sat 5 Dec – Wed 16 Dec 2026', 'format range');
$pub = atb_public_departure(['id' => 'X', 'tour_slug' => 's', 'status' => 'scheduled', 'departure_type' => 'shared', 'published' => true, 'start_date' => '2026-12-05', 'end_date' => '2026-12-16', 'duration_days' => 12, 'min_group_size' => 6, 'max_capacity' => 18, 'confirmed_count' => 2, 'internal_notes' => 'secret', 'operational_approval' => 'approved', 'price' => ['amount' => 2100, 'price_status' => 'reference_from_production']], null, [], '2026-10-10');
foreach (['internal_notes', 'operational_approval', 'confirmed_count', 'pending_count', 'max_capacity', 'travelers'] as $k) $ok(!array_key_exists($k, $pub), "no $k in public");
$ok(!str_contains(json_encode($pub), 'secret'), 'no secret');
$ok($pub['status_text'] === 'Open — awaiting minimum 6 travelers', 'open wording');
$ok($pub['cta'] === 'Request a Place', 'cta');
$ok($pub['price_label'] === 'From $2,100 per person on shared departures', 'price label');

foreach ($fx['religious'] as $r) {
    $f = atb_religious_flags($r['dep'], $fx['calendar']);
    $ok((count($f['ramadan']) > 0) === $r['ramadan'], "religious ramadan: {$r['name']}");
    $ok((count(atb_eid_conflicts($r['dep'], $fx['calendar'])) > 0) === $r['eid'], "religious eid: {$r['name']}");
    if (array_key_exists('unresolved', $r)) $ok((count(atb_eid_unresolved($r['dep'], $fx['calendar'])) > 0) === $r['unresolved'], "religious unresolved: {$r['name']}");
    if (!empty($r['manual_review'])) $ok(count(atb_eid_blocks_for_range($r['dep']['start_date'], $r['dep']['end_date'], $fx['calendar'])) > 0, "manual review: {$r['name']}");
}
foreach ($fx['counting'] as $c) {
    $counts = atb_counts($c['travelers']);
    $ok((int)($counts['D']['confirmed'] ?? 0) === $c['confirmed'], "counting: {$c['name']}");
}
$S = $fx['settings'] + ['religious_calendar' => $fx['calendar']];
$rp = atb_public_departure(['id' => 'R1', 'tour_slug' => 'weekend-in-kabul', 'status' => 'scheduled', 'published' => true, 'departure_type' => 'shared', 'start_date' => '2027-03-05', 'end_date' => '2027-03-07', 'min_group_size' => 2], null, $S, '2026-10-10');
$ok($rp['status'] === 'open' && $rp['selectable'] === true && count($rp['advisories']) === 1 && $rp['advisories'][0]['text'] === ATB_RAMADAN_COMPACT, 'Ramadan advisory shown, booking allowed');
$ok(ATB_EID_NOTICE === 'Eid operating period — standard scheduled departures are not available on these dates. If you need to travel during Eid, please contact AfghanTours to discuss a special arrangement.', 'Eid exact copy');
$ok(ATB_RAMADAN_COMPACT === 'Ramadan departure — tours continue to operate, with some adjustments to opening hours, meals and daily scheduling.', 'Ramadan compact exact copy');
$blocks = atb_public_eid_blocks($fx['calendar'], '2026-10-10');
$ok(count($blocks) === 2 && $blocks[0]['start'] === '2027-03-08' && $blocks[0]['end'] === '2027-03-12' && str_ends_with($blocks[0]['label'], '(expected)'), 'Eid al-Fitr block = day before … +3, shown as expected');
$ok($blocks[1]['start'] === '2027-05-15' && $blocks[1]['end'] === '2027-05-19', 'Eid al-Adha block');
// publishing a proposed departure needs price approval and no unresolved Eid conflict
$inv = ['tours' => [['slug' => 'weekend-in-kabul', 'category' => 'A', 'duration_days' => 3, 'name' => 'Weekend in Kabul']], 'settings' => $fx['settings'], 'religious_calendar' => $fx['calendar'], 'blackouts' => []];
$pd = ['tour_slug' => 'weekend-in-kabul', 'status' => 'scheduled', 'departure_type' => 'shared', 'start_date' => '2027-03-06', 'end_date' => '2027-03-08', 'min_group_size' => 2, 'max_capacity' => null, 'price_approved' => false];
$errs = implode(' ', atb_validate_departure($pd, $inv, '2026-10-10', true, true));
$ok(str_contains($errs, 'Price not approved') && str_contains($errs, 'Eid conflict'), 'publish blocked: price not approved + Eid conflict');
$pd['price_approved'] = true; $pd['eid_reviews'] = ['eid_al_fitr:2027-03-08:2027-03-12' => ['override' => true, 'note' => 'owner approved', 'by' => 'james']];
$ok(atb_validate_departure($pd, $inv, '2026-10-10', true, true) === [], 'publish allowed after price approval + Eid override');

// JS parity: the snapshot labels the build produced must equal PHP output for the seed.
$seed = json_decode((string)file_get_contents(__DIR__ . '/../../data/booking/departures.json'), true)['departures'];
$settings = json_decode((string)file_get_contents(__DIR__ . '/../../data/booking/settings.json'), true);
$settings['religious_calendar'] = json_decode((string)file_get_contents(__DIR__ . '/../../data/booking/religious-calendar.json'), true);
$parity = __DIR__ . '/.parity.json';
if (is_file($parity)) {
    $js = json_decode((string)file_get_contents($parity), true);
    foreach ($seed as $d) {
        $p = atb_public_departure($d, null, $settings, $js['today']);
        $j = $js['rows'][$d['id']] ?? null;
        $ok($j !== null && $j['status'] === $p['status'] && $j['date_label'] === $p['date_label'] && $j['price_label'] === $p['price_label'] && $j['status_text'] === $p['status_text'] && $j['cta'] === $p['cta'] && json_encode($j['advisories']) === json_encode($p['advisories']), "parity {$d['id']}");
    }
}
echo "PHP core tests: $pass passed, $fail failed\n";
exit($fail ? 1 : 0);
