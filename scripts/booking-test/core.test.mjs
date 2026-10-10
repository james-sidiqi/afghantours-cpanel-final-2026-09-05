import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeStatus, isPublic, groupMinimumNote, expectedEnd, inclusiveDays, priceLabel, publicDeparture, formatRange } from '../../src/lib/booking/core.mjs';

const fx = JSON.parse(readFileSync(new URL('./fixtures.json', import.meta.url), 'utf8'));

for (const c of fx.cases) {
  test(`status: ${c.name}`, () => {
    assert.equal(computeStatus(c.dep, c.today, fx.settings).key, c.expect);
    if ('expect_public' in c) assert.equal(isPublic(c.dep, c.today), c.expect_public);
  });
}
for (const g of fx.group_minimum) {
  test(`group minimum: ${g.travelers} ${g.type}`, () => assert.equal(groupMinimumNote(g.travelers, g.type, 3), g.expect));
}
for (const d of fx.dates) {
  test(`inclusive dates ${d.start} + ${d.days}d`, () => {
    assert.equal(expectedEnd(d.start, d.days), d.end);
    assert.equal(inclusiveDays(d.start, d.end), d.days);
  });
}
for (const p of fx.prices) {
  test(`price label ${p.expect}`, () => assert.equal(priceLabel(p.price, { usd_confirmed: p.usd_confirmed }), p.expect));
}
test('public projection never leaks internal fields', () => {
  const dep = { id: 'X', tour_slug: 's', tour_code: 'S', status: 'scheduled', published: true, start_date: '2026-12-05', end_date: '2026-12-16', duration_days: 12, min_group_size: 3, max_capacity: 8, confirmed_count: 2, internal_notes: 'secret', operational_approval: 'approved', travelers: [{ name: 'A' }], price: { amount: 2100, price_status: 'reference_from_production' } };
  const out = publicDeparture(dep, null, { show_public_capacity: false, show_public_confirmed_counts: false }, '2026-10-10');
  assert.ok(!JSON.stringify(out).includes('secret'));
  for (const bad of ['internal_notes', 'operational_approval', 'travelers', 'confirmed_count', 'pending_count', 'max_capacity', 'remaining_places']) assert.ok(!(bad in out), bad);
  assert.equal(out.status_text, 'Awaiting group confirmation — minimum 3 travelers.');
  assert.equal(out.cta, 'Request a Place');
});
test('public counts only when admin approves', () => {
  const dep = { id: 'X', status: 'scheduled', published: true, start_date: '2026-12-05', end_date: '2026-12-16', min_group_size: 3, confirmed_count: 2, public_counts_approved: true };
  assert.equal(publicDeparture(dep, null, { show_public_confirmed_counts: true }, '2026-10-10').confirmed_text, '2 of 3 travelers confirmed.');
  assert.equal(publicDeparture({ ...dep, public_counts_approved: false }, null, { show_public_confirmed_counts: true }, '2026-10-10').confirmed_text, undefined);
});
test('date range label', () => assert.equal(formatRange('2026-12-05', '2026-12-16'), 'Sat 5 Dec – Wed 16 Dec 2026'));
