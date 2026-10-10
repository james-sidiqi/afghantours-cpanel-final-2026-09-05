import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeStatus, isPublic, groupMinimumNote, groupRuleFor, statusText, expectedEnd, inclusiveDays, priceLabel, publicDeparture, publicDeparturesFor, formatRange, religiousFlags, eidConflicts, eidUnresolved, eidManualReview, countsTowardMinimum, RAMADAN_COMPACT, EID_NOTICE, RAMADAN_ADVISORY_PARAGRAPHS } from '../../src/lib/booking/core.mjs';

const fx = JSON.parse(readFileSync(new URL('./fixtures.json', import.meta.url), 'utf8'));

for (const c of fx.cases) {
  test(`status: ${c.name}`, () => {
    assert.equal(computeStatus(c.dep, c.today, { ...fx.settings, ...(c.settings || {}) }).key, c.expect);
    if ('expect_public' in c) assert.equal(isPublic(c.dep, c.today), c.expect_public);
  });
}
for (const g of fx.group_minimum) {
  test(`group minimum (${g.label}): ${g.travelers} ${g.type}`, () => assert.equal(groupMinimumNote(g.travelers, g.type, g.min), g.expect));
}
for (const r of fx.group_rule) {
  test(`group rule ${r.days} days`, () => assert.deepEqual(groupRuleFor(r.days, fx.settings), { applies: r.applies, min: r.min, max: r.max }));
}
for (const s of fx.status_text) {
  test(`status wording min ${s.min}`, () => assert.equal(statusText('open', { min_group_size: s.min }), s.expect));
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
  const dep = { id: 'X', tour_slug: 's', tour_code: 'S', status: 'scheduled', departure_type: 'shared', published: true, start_date: '2026-12-05', end_date: '2026-12-16', duration_days: 12, min_group_size: 6, max_capacity: 18, confirmed_count: 2, internal_notes: 'secret', operational_approval: 'approved', travelers: [{ name: 'A' }], price: { amount: 2100, price_status: 'reference_from_production' } };
  const out = publicDeparture(dep, null, { show_public_capacity: false, show_public_confirmed_counts: false }, '2026-10-10');
  assert.ok(!JSON.stringify(out).includes('secret'));
  for (const bad of ['internal_notes', 'operational_approval', 'travelers', 'confirmed_count', 'pending_count', 'max_capacity', 'remaining_places']) assert.ok(!(bad in out), bad);
  assert.equal(out.status_text, 'Open — awaiting minimum 6 travelers');
  assert.equal(out.status_label, 'Open');
  assert.equal(out.cta, 'Request a Place');
  assert.equal(out.price_label, 'From $2,100 per person on shared departures');
});
test('public counts only when admin approves', () => {
  const dep = { id: 'X', status: 'scheduled', published: true, start_date: '2026-12-05', end_date: '2026-12-16', min_group_size: 6, confirmed_count: 2, public_counts_approved: true };
  assert.equal(publicDeparture(dep, null, { show_public_confirmed_counts: true }, '2026-10-10').confirmed_text, '2 of 6 travelers confirmed.');
  assert.equal(publicDeparture({ ...dep, public_counts_approved: false }, null, { show_public_confirmed_counts: true }, '2026-10-10').confirmed_text, undefined);
});
test('public vocabulary only', () => {
  for (const c of fx.cases) {
    if (isPublic(c.dep, c.today)) assert.ok(['open', 'confirmed', 'limited', 'sold_out', 'closed'].includes(computeStatus(c.dep, c.today, fx.settings).key), c.name);
  }
});
test('date range label', () => assert.equal(formatRange('2026-12-05', '2026-12-16'), 'Sat 5 Dec – Wed 16 Dec 2026'));

for (const r of fx.religious) {
  test(`religious: ${r.name}`, () => {
    const f = religiousFlags(r.dep, fx.calendar);
    assert.equal(f.ramadan.length > 0, r.ramadan, 'ramadan');
    assert.equal(eidConflicts(r.dep, fx.calendar).length > 0, r.eid, 'eid conflict');
    if ('unresolved' in r) assert.equal(eidUnresolved(r.dep, fx.calendar).length > 0, r.unresolved, 'unresolved');
    if (r.manual_review) assert.ok(eidManualReview({ start: r.dep.start_date, end: r.dep.end_date }, fx.calendar).length > 0, 'manual review');
  });
}
for (const c of fx.counting) {
  test(`counting: ${c.name}`, () => {
    const n = c.travelers.filter(countsTowardMinimum).reduce((a, t) => a + t.party_size, 0);
    assert.equal(n, c.confirmed);
  });
}
const S = { ...fx.settings, religious_calendar: fx.calendar };
test('Ramadan advisory shown and booking still allowed', () => {
  const dep = { id: 'R1', tour_slug: 'weekend-in-kabul', status: 'scheduled', published: true, departure_type: 'shared', start_date: '2027-03-05', end_date: '2027-03-07', min_group_size: 2 };
  const out = publicDeparture(dep, null, S, '2026-10-10');
  assert.equal(out.status, 'open');
  assert.equal(out.selectable, true);
  assert.equal(out.cta, 'Request a Place');
  assert.equal(out.advisories.length, 1);
  assert.equal(out.advisories[0].text, 'Ramadan departure — tours continue to operate, with some adjustments to opening hours, meals and daily scheduling.');
  assert.match(out.advisories[0].period_label, /\(expected\)$/);
  assert.equal(publicDeparturesFor('weekend-in-kabul', [dep], null, S, '2026-10-10').length, 1);
});
test('Ramadan exact copy', () => {
  assert.equal(RAMADAN_COMPACT, 'Ramadan departure — tours continue to operate, with some adjustments to opening hours, meals and daily scheduling.');
  assert.equal(RAMADAN_ADVISORY_PARAGRAPHS[1], 'AfghanTours remains open for business and tours continue to operate during Ramadan.');
  assert.ok(!RAMADAN_ADVISORY_PARAGRAPHS.join(' ').match(/closed/i));
});
test('Eid exact copy', () => assert.equal(EID_NOTICE, 'Eid operating period — standard scheduled departures are not available on these dates. If you need to travel during Eid, please contact AfghanTours to discuss a special arrangement.'));
test('Eid: unresolved conflict is dropped from the public list (not deleted), reviewed one is shown', () => {
  const dep = { id: 'E1', tour_slug: 'weekend-in-kabul', status: 'scheduled', published: true, departure_type: 'shared', start_date: '2027-03-06', end_date: '2027-03-08', min_group_size: 2 };
  assert.equal(publicDeparturesFor('weekend-in-kabul', [dep], null, S, '2026-10-10').length, 0);
  const ok = { ...dep, eid_reviews: { 'eid_al_fitr:2027-03-08:2027-03-12': { override: true, note: 'special arrangement approved', by: 'james' } } };
  assert.equal(publicDeparturesFor('weekend-in-kabul', [ok], null, S, '2026-10-10').length, 1);
});
test('Group: accepted booking without payment does not move a short departure to Confirmed', () => {
  const travelers = [{ status: 'confirmed', party_size: 2, payment_status: 'not_recorded' }];
  const confirmed = travelers.filter(countsTowardMinimum).reduce((a, t) => a + t.party_size, 0);
  const dep = { status: 'scheduled', start_date: '2026-12-05', end_date: '2026-12-07', departure_type: 'shared', min_group_size: 2, confirmed_count: confirmed, operational_approval: 'approved' };
  assert.equal(computeStatus(dep, '2026-10-10', fx.settings).key, 'open');
  assert.equal(computeStatus({ ...dep, confirmed_count: 2 }, '2026-10-10', fx.settings).key, 'confirmed');
});
