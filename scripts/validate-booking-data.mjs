#!/usr/bin/env node
/**
 * Validate the booking seed (data/booking/*.json) — run in CI.
 * Errors fail the build. Warnings are printed for James/admin attention.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import {
  STORED_STATUSES, groupRuleFor, isIsoDate, inclusiveDays, expectedEnd, weekday, computeStatus, isPublic, todayIn,
} from '../src/lib/booking/core.mjs';

const ROOT = process.cwd();
const read = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'));
const catalog = read('data/booking/tours-catalog.json');
const { departures } = read('data/booking/departures.json');
const { blackouts } = read('data/booking/blackouts.json');
const settings = read('data/booking/settings.json');
const toursCsv = parse(readFileSync(path.join(ROOT, 'data/tours.csv'), 'utf8'), { columns: true, skip_empty_lines: true, bom: true });

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);
const seedAsOf = settings.seed_as_of;
const today = process.env.BOOKING_TODAY || todayIn(settings.timezone || 'Asia/Kabul');

// ---------- catalog ----------
const tours = catalog.tours;
const bySlug = new Map();
const codes = new Set();
for (const t of tours) {
  if (bySlug.has(t.slug)) err(`duplicate tour slug ${t.slug}`);
  if (codes.has(t.code)) err(`duplicate tour code ${t.code}`);
  bySlug.set(t.slug, t);
  codes.add(t.code);
  if (!['A', 'B', 'C', 'D', 'inactive'].includes(t.category)) err(`${t.slug}: bad category ${t.category}`);
}
const expectA = ['weekend-in-kabul', 'winter-circuit', 'summer-circuit', 'buzkashi-expedition', 'afghanistan-discovery-tour-spring', 'afghanistan-discovery-tour-fall'];
const expectB = ['kabul-surroundings', 'central-afghanistan-discovery', 'bamyan-skiing-tour', 'panjshir-valley-emeralds-history', 'kandahar-durrani-empire-tour'];
const expectC = ['treasures-of-silk-road-afghanistan', 'timurid-grandeur-herat-tour'];
const expectD = ['custom-expedition', 'noshaq-expedition-support', 'photography-tour', 'scientific-expeditions', 'ski-expeditions', 'business-investment', 'media-support', 'veteran-return'];
for (const [cat, list] of [['A', expectA], ['B', expectB], ['C', expectC], ['D', expectD]]) {
  for (const s of list) if (bySlug.get(s)?.category !== cat) err(`${s} must be category ${cat} (spec Part 2)`);
  const actual = tours.filter((t) => t.category === cat).map((t) => t.slug).sort();
  if (actual.join() !== [...list].sort().join()) err(`category ${cat} membership differs from spec: ${actual.join(', ')}`);
}
for (const inactive of ['trek-the-wakhan-corridor', 'timurid-grandeur-herat-tour-add-minaret-e-jam']) {
  const t = bySlug.get(inactive);
  if (!t || t.active !== false || t.category !== 'inactive') err(`${inactive} must stay inactive in the catalog`);
  const row = toursCsv.find((r) => r.slug === inactive);
  if (row && String(row.is_active) !== '0') err(`${inactive} must stay is_active=0 in tours.csv`);
}
const csvBySlug = new Map(toursCsv.map((r) => [r.slug, r]));
for (const t of tours.filter((x) => ['A', 'B', 'C'].includes(x.category))) {
  const row = csvBySlug.get(t.slug);
  if (!row) { err(`${t.slug}: missing from tours.csv`); continue; }
  if (String(row.is_active) !== '1') err(`${t.slug}: catalog active but tours.csv inactive`);
  if (Number(row.duration_days) !== t.duration_days) err(`${t.slug}: duration ${t.duration_days} ≠ tours.csv ${row.duration_days}`);
  if (t.nights !== t.duration_days - 1) err(`${t.slug}: nights must be duration − 1`);
  const rule = groupRuleFor(t.duration_days, settings);
  if (rule.applies) {
    if (t.shared_min_group !== rule.min || t.shared_max_group !== rule.max) err(`${t.slug}: ${t.duration_days}-day scheduled tour must be ${rule.min}–${rule.max} (spec 10 Oct Part 1 §2)`);
  } else if (t.shared_min_group !== rule.min || (t.shared_max_group ?? null) !== null) {
    err(`${t.slug}: ≤4-day shared departures need minimum ${rule.min} and no standard maximum (owner decision 10 Oct 2026)`);
  }
  const labels = catalog.booking_types || {};
  if (!t.booking_type || !labels[t.booking_type]) err(`${t.slug}: missing booking_type`);
  const p = t.price || {};
  if (p.reference_amount != null && !(Number(p.reference_amount) > 0)) err(`${t.slug}: bad reference price`);
  if (p.currency && p.currency !== 'USD') err(`${t.slug}: currency must be USD (stored)`);
  if (!['reference_from_production', 'approved', 'price_on_request'].includes(p.price_status)) err(`${t.slug}: bad price_status ${p.price_status}`);
  const csvPrice = String(row.price_from || '').trim();
  if (csvPrice && Number(csvPrice) !== Number(p.reference_amount)) err(`${t.slug}: tours.csv price_from ${csvPrice} disagrees with catalog ${p.reference_amount}`);
  if (p.price_status === 'reference_from_production') warn(`${t.slug}: price ${p.production_display_2026_10_10} is a production reference — needs James review`);
}
for (const t of tours.filter((x) => x.category === 'D')) {
  const legacy = path.join(ROOT, 'public', t.url.replace(/^\//, ''), 'index.html');
  if (!existsSync(legacy)) err(`${t.slug}: legacy URL ${t.url} has no page/stub in public/`);
  const html = existsSync(legacy) ? readFileSync(legacy, 'utf8') : '';
  const target = (html.match(/location\.replace\('([^']+)'\)/) || [])[1];
  if (target && target !== t.current_page) err(`${t.slug}: stub redirects to ${target} but catalog says ${t.current_page}`);
  const distTarget = path.join(ROOT, 'dist', String(t.current_page).replace(/^\//, ''), 'index.html');
  if (existsSync(path.join(ROOT, 'dist', 'index.html')) && !existsSync(distTarget)) err(`${t.slug}: redirect target ${t.current_page} is not built (would 404)`);
  if (t.price?.display_on_site !== false) err(`${t.slug}: category D must not display catalog prices without approval`);
  if (t.route_text !== 'Route designed around your requirements') err(`${t.slug}: route_text must be "Route designed around your requirements"`);
}

// ---------- blackouts ----------
const boIds = new Set();
for (const b of blackouts) {
  if (boIds.has(b.id)) err(`duplicate blackout ${b.id}`);
  boIds.add(b.id);
  if (!isIsoDate(b.start_date) || !isIsoDate(b.end_date) || b.end_date < b.start_date) err(`${b.id}: bad dates`);
  if (b.confirmed !== true && !/admin must confirm|advisory/i.test(String(b.source || ''))) err(`${b.id}: unconfirmed blackout must say it needs admin confirmation`);
  if (b.confirmed !== true) warn(`${b.id} (${b.start_date}–${b.end_date}) is an unconfirmed estimate — admin must confirm`);
}
const overlaps = (d, b) => d.start_date <= b.end_date && d.end_date >= b.start_date;
const applies = (b, slug) => (b.applies_to || []).includes('*') || (b.applies_to || []).includes(slug);

// ---------- departures ----------
const ids = new Set();
const keyset = new Set();
for (const d of departures) {
  const where = `${d.id}`;
  if (ids.has(d.id)) err(`duplicate departure id ${d.id}`);
  ids.add(d.id);
  const key = `${d.tour_slug}|${d.start_date}|${d.departure_type}`;
  if (keyset.has(key)) err(`${where}: duplicate departure for same tour/start/type`);
  keyset.add(key);
  const t = bySlug.get(d.tour_slug);
  if (!t) { err(`${where}: unknown tour ${d.tour_slug}`); continue; }
  if (!['A', 'B', 'C'].includes(t.category)) err(`${where}: departures not allowed for category ${t.category} (${t.slug})`);
  if (d.tour_code !== t.code) err(`${where}: tour_code ${d.tour_code} ≠ ${t.code}`);
  if (!isIsoDate(d.start_date) || !isIsoDate(d.end_date)) { err(`${where}: invalid dates`); continue; }
  if (d.duration_days !== t.duration_days) err(`${where}: duration ${d.duration_days} ≠ tour ${t.duration_days}`);
  const days = inclusiveDays(d.start_date, d.end_date);
  if (days !== t.duration_days) {
    if (d.date_check?.ok === false && d.source !== 'proposed_2026-10-10' && d.status !== 'proposed') {
      warn(`${where}: FLAGGED existing production date (not changed) — ${d.date_check.note}`);
    } else {
      err(`${where}: ${d.start_date}–${d.end_date} is ${days} days inclusive, tour is ${t.duration_days} (expected end ${expectedEnd(d.start_date, t.duration_days)})`);
    }
  }
  if (d.date_check && d.date_check.ok !== (days === t.duration_days)) err(`${where}: date_check.ok is wrong`);
  if (!STORED_STATUSES.includes(d.status)) err(`${where}: stored status ${d.status} not allowed (Confirmed/Sold Out/Limited are computed, never stored)`);
  if (!['shared', 'private'].includes(d.departure_type)) err(`${where}: bad departure_type`);
  if (d.departure_type === 'shared') {
    const r = groupRuleFor(t.duration_days, settings);
    const exception = typeof d.group_exception_note === 'string' && d.group_exception_note.trim() !== '';
    if (r.applies && !exception && (d.min_group_size !== r.min || d.max_capacity !== r.max)) err(`${where}: shared ${t.duration_days}-day departure must be ${r.min}–${r.max} unless an approved exception is recorded`);
    if (!r.applies && !exception && (d.min_group_size !== r.min || d.max_capacity !== null)) err(`${where}: ≤4-day shared departure must have minimum ${r.min} and no standard maximum (unless an approved exception is recorded)`);
  }
  if (d.max_capacity !== null && !(Number.isInteger(d.max_capacity) && (d.min_group_size === null || d.max_capacity >= d.min_group_size))) err(`${where}: max_capacity must be null or an integer ≥ minimum`);
  if (d.confirmed_count !== 0 || d.pending_count !== 0) err(`${where}: seed counts must be 0 — no invented bookings`);
  if (d.operational_approval === 'approved') err(`${where}: seed must not pre-approve departures`);
  if (d.public_counts_approved) err(`${where}: seed must not pre-approve public counts`);
  if ((d.status === 'proposed' || d.status === 'draft') && d.published) err(`${where}: proposed/draft departure is published`);
  if (d.published && d.end_date < seedAsOf) err(`${where}: published departure ended before seed date ${seedAsOf}`);
  if (d.published && d.end_date < today) warn(`${where}: ended ${d.end_date} — shown as Completed at runtime; mark completed in admin`);
  if (d.published && d.max_capacity === null) warn(`${where}: published without max capacity — admin must set it`);
  if (d.status === 'proposed' && (d.start_date < '2026-11-01' || d.end_date > '2027-12-31')) err(`${where}: proposed outside Nov 2026–Dec 2027`);
  if (d.price?.amount != null && Number(d.price.amount) !== Number(t.price?.reference_amount)) err(`${where}: price ${d.price.amount} differs from the tour reference price (no invented prices)`);
  if (t.slug === 'weekend-in-kabul') {
    const wd = weekday(d.start_date);
    const opt = wd === 5 ? 'fri-sun' : wd === 6 ? 'sat-mon' : null;
    if (d.status === 'proposed' && !opt) err(`${where}: Weekend in Kabul proposals must start Friday or Saturday`);
    if (d.arrival_option !== opt) err(`${where}: arrival_option ${d.arrival_option} ≠ weekday-derived ${opt}`);
  }
  for (const b of blackouts) {
    if (!applies(b, d.tour_slug) || !overlaps(d, b)) continue;
    if (!b.blocking) { if (d.published) warn(`${where}: published departure falls in advisory period ${b.id}`); continue; }
    if (d.status === 'proposed') err(`${where}: proposed departure overlaps blackout ${b.id}`);
    else if (d.published && b.confirmed) err(`${where}: published departure overlaps CONFIRMED blackout ${b.id}`);
    else if (d.published) warn(`${where}: published departure overlaps unconfirmed blackout ${b.id}`);
  }
  // Status sanity: a seed departure can never compute to Confirmed / Limited / Sold out.
  const st = computeStatus(d, today, settings);
  if (['confirmed', 'limited', 'sold_out'].includes(st.key)) err(`${where}: seed computes to ${st.key} — impossible without approved confirmed travelers`);
  if (st.key === 'proposed' && isPublic(d, today)) err(`${where}: proposed departure would be public`);
}
// no departures for inactive tours
for (const d of departures) if (['trek-the-wakhan-corridor', 'timurid-grandeur-herat-tour-add-minaret-e-jam'].includes(d.tour_slug)) err(`${d.id}: inactive tour has a departure`);

const summary = {
  tours: tours.length,
  departures: departures.length,
  published: departures.filter((d) => d.published).length,
  public_today: departures.filter((d) => isPublic(d, today)).length,
  proposed: departures.filter((d) => d.status === 'proposed').length,
  history: departures.filter((d) => d.status === 'completed').length,
  today,
};
console.log('BOOKING DATA VALIDATION', JSON.stringify(summary));
for (const w of warnings) console.log('WARN ', w);
for (const e of errors) console.log('ERROR', e);
console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
