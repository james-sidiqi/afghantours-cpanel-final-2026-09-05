/**
 * AfghanTours booking core — pure functions shared by the Astro build (snapshot),
 * the validation script and the unit tests.
 *
 * The PHP runtime (public/booking/lib/booking.php) implements the SAME rules;
 * scripts/booking-test/parity.mjs + test-core.php check both agree on a fixture set.
 *
 * Rules (James's controlling spec of 10 Oct 2026, Part 1):
 *  - Scheduled group tours of 5+ days: minimum to operate 6 confirmed travelers, normal maximum 18
 *    (per-departure values; exceptions only when approved). Shared departures of 4 days or less:
 *    minimum 2, no standard maximum (owner decision 10 Oct 2026). Private: from 1 traveler.
 *    A departure with no minimum recorded can never become Confirmed.
 *  - Confirmed needs confirmed travelers >= min_group_size AND operational approval. Never automatic.
 *  - One public vocabulary: Open — awaiting minimum N travelers / Confirmed / Limited / Sold out / Closed.
 *    Cancelled, completed (past), private and proposed departures are internal and never public.
 *  - Only bookings that are accepted AND have payment recorded as received count. Inquiries never count.
 *  - Limited is MANUAL only (limited_manual). Sold out is automatic only where a capacity exists.
 *    Booking cutoffs close a departure only when settings.auto_cutoff_close === true (off until approved).
 *  - Ramadan = advisory only (never blocks or closes). Eid = five-day block (day before … +3) for
 *    standard scheduled departures; conflicts need an explicit admin review/override.
 *  - Long shared departures (5+ days), owner decision 10 Oct 2026 18:56: from 45 days out (days_until <= 45) a departure
 *    is public only if Confirmed (minimum + operational approval) or operating by an approved exception (note + pricing
 *    review + operational approval + price re-approved); otherwise it is the internal 'review' state (hidden, admin flag).
 *    From 7 days out (days_until <= 7) booking_window_closed: still visible as Confirmed, CTA = last-minute contact.
 *    Sold out overrides everything. Short tours (≤4 days) and private departures are unaffected.
 *  - Ended departures are "Completed" and never selectable. Started ones are "Closed".
 *  - Proposed/draft departures are never public.
 */

export const STATUS = {
  open: 'Open',
  confirmed: 'Confirmed',
  limited: 'Limited',
  sold_out: 'Sold out',
  closed: 'Closed',
  // internal only (never in the public feed)
  on_request: 'Private — on request',
  cancelled: 'Cancelled',
  completed: 'Completed (past)',
  proposed: 'Proposed (not public)',
  review: 'Minimum-group review (not public)',
};
export const PUBLIC_STATUSES = ['open', 'confirmed', 'limited', 'sold_out', 'closed'];

// 'withdrawn' = superseded/withdrawn proposal: kept for the record, never publishable, never public.
export const STORED_STATUSES = ['proposed', 'draft', 'scheduled', 'on_request', 'closed', 'cancelled', 'completed', 'withdrawn'];
export const SELECTABLE = new Set(['open', 'confirmed', 'limited']);

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value) {
  if (!ISO.test(String(value || ''))) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Today's date (YYYY-MM-DD) in Kabul, regardless of the machine zone. */
export function todayIn(timeZone = 'Asia/Kabul', now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Inclusive day count: 2026-12-05 → 2026-12-16 is 12 days. */
export function inclusiveDays(start, end) {
  const a = Date.parse(`${start}T00:00:00Z`);
  const b = Date.parse(`${end}T00:00:00Z`);
  return Math.round((b - a) / 86400000) + 1;
}

/** end = start + (duration_days − 1) */
export function expectedEnd(start, durationDays) {
  return addDays(start, Number(durationDays) - 1);
}

export function weekday(iso) {
  return new Date(`${iso}T00:00:00Z`).getUTCDay(); // 0 Sun … 5 Fri, 6 Sat
}

export function toInt(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export function daysBetween(fromIso, toIso) {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86400000);
}

/**
 * Traveler-count provenance (owner correction 10 Oct 2026 19:01): unknown ≠ zero.
 * 'unknown' = legacy departure with no migrated traveler records; 'verified' = system-managed or reconciled (zero means zero).
 */
export function countStatus(dep) {
  if (dep.traveler_count_status === 'unknown' || dep.traveler_count_status === 'verified') return dep.traveler_count_status;
  return dep.confirmed_count === null || dep.confirmed_count === undefined ? 'unknown' : 'verified';
}
export const CONTACT_CTA = 'Contact us for availability';
export const MANUAL_CONTACT_TEXT = 'Availability on request';

/** Approved minimum-group exception (decision B): note + pricing review + operational approval + price re-approved. */
export function exceptionApproved(dep) {
  const x = dep.min_group_exception;
  return !!(x && x.approved === true && String(x.note || '').trim() !== '' && x.pricing_review_ack === true && x.by)
    && dep.operational_approval === 'approved' && dep.price_approved === true;
}

/**
 * Long-tour (5+ day shared) review / cutoff window. Pure date arithmetic on Kabul dates.
 * state: none | open (before review) | confirmed | exception | min_not_reached | approval_required
 */
export function longTourWindow(dep, today, settings = {}) {
  const longDays = toInt(settings.group_rule?.long_tour_min_days, 5);
  const duration = toInt(dep.duration_days, null) ?? (isIsoDate(dep.start_date) && isIsoDate(dep.end_date) ? inclusiveDays(dep.start_date, dep.end_date) : 0);
  const isLong = duration >= longDays;
  // Short (≤4-day) shared departures: same review pattern at short_tour_min_group_review_days (14), but no final booking cutoff.
  const shortReview = toInt(settings.short_tour_min_group_review_days, null);
  const applies = dep.departure_type !== 'private' && isIsoDate(dep.start_date) && duration > 0 && (isLong || shortReview !== null);
  if (!applies) return { applies: false, state: 'none', booking_window_closed: false };
  if (!isLong) return reviewWindow(dep, today, { kind: 'short', reviewDays: shortReview, cutoffDays: null });
  return reviewWindow(dep, today, { kind: 'long', reviewDays: toInt(settings.long_tour_min_group_review_days, 45), cutoffDays: toInt(settings.long_tour_final_booking_cutoff_days, 7) });
}

function reviewWindow(dep, today, { kind, reviewDays, cutoffDays }) {
  const daysUntil = daysBetween(today, dep.start_date);
  const unknown = countStatus(dep) === 'unknown';
  const min = toInt(dep.min_group_size, null);
  const confirmed = Math.max(0, toInt(dep.confirmed_count, 0));
  const minReached = !unknown && min !== null && min > 0 && confirmed >= min;
  const approved = dep.operational_approval === 'approved';
  const reviewDue = daysUntil <= reviewDays;
  let state = 'open';
  if (minReached && approved) state = 'confirmed';
  else if (exceptionApproved(dep)) state = 'exception';
  else if (reviewDue && unknown) state = 'unknown'; // stays visible, manual contact only, until reconciled
  else if (reviewDue) state = minReached ? 'approval_required' : 'min_not_reached';
  const hasCutoff = cutoffDays !== null;
  return {
    applies: true,
    kind,
    days_until: daysUntil,
    review_days: reviewDays,
    cutoff_days: cutoffDays,
    review_date: addDays(dep.start_date, -reviewDays),
    cutoff_date: hasCutoff ? addDays(dep.start_date, -cutoffDays) : null,
    review_due: reviewDue,
    review_overdue: daysUntil < reviewDays && (state === 'min_not_reached' || state === 'approval_required'),
    legacy_error: kind === 'long' && daysUntil < 30 && state === 'min_not_reached',
    count_status: unknown ? 'unknown' : 'verified',
    unknown_review: state === 'unknown',
    unknown_immediate: hasCutoff && state === 'unknown' && daysUntil <= cutoffDays,
    manual_contact: state === 'unknown',
    min_reached: minReached,
    state,
    booking_window_closed: hasCutoff && daysUntil <= cutoffDays,
  };
}

/**
 * Compute the customer-facing status of a departure.
 * @returns {{key:string,label:string,selectable:boolean,remaining:number|null}}
 */
export function computeStatus(dep, today, settings = {}) {
  const stored = String(dep.status || '').toLowerCase();
  const min = toInt(dep.min_group_size, null); // null = minimum not set by the owner → never Confirmed
  const cap = toInt(dep.max_capacity, null);
  const confirmed = Math.max(0, toInt(dep.confirmed_count, 0));
  const remaining = cap === null ? null : Math.max(cap - confirmed, 0);
  const out = (key) => ({ key, label: STATUS[key], selectable: SELECTABLE.has(key), remaining });

  if (stored === 'proposed' || stored === 'draft') return out('proposed');
  if (!isIsoDate(dep.start_date) || !isIsoDate(dep.end_date)) return out('closed');
  if (dep.end_date < today || stored === 'completed') return out('completed');
  if (stored === 'cancelled' || stored === 'withdrawn') return out('cancelled');
  if (stored === 'closed') return out('closed');
  if (dep.start_date <= today) return out('closed');
  if (settings.auto_cutoff_close === true && dep.booking_cutoff && isIsoDate(dep.booking_cutoff) && today > dep.booking_cutoff) return out('closed');
  if (dep.departure_type === 'private' || stored === 'on_request') return out('on_request');
  if (remaining === 0) return out('sold_out');
  const lw = longTourWindow(dep, today, settings);
  if (lw.applies && (lw.state === 'min_not_reached' || lw.state === 'approval_required')) return out('review'); // admin decision required, never public Open
  if (dep.limited_manual === true) return out('limited'); // manual only — never automatic
  if (min !== null && min > 0 && confirmed >= min && dep.operational_approval === 'approved') return out('confirmed');
  if (lw.applies && lw.state === 'exception') return out('confirmed'); // operating by approved exception
  return out('open');
}

/** Listed on the site = public AND no unresolved Eid conflict AND not held for a long-tour minimum-group decision. */
export function isListed(dep, today, settings = {}) {
  if (!isPublic(dep, today)) return false;
  if (eidUnresolved(dep, settings.religious_calendar || {}).length) return false;
  return computeStatus(dep, today, settings).key !== 'review';
}

/** Public = published, not proposed/draft, and not ended. */
export function isPublic(dep, today) {
  // NB: callers listing departures also drop unresolved Eid conflicts (see publicDeparturesFor).
  const stored = String(dep.status || '').toLowerCase();
  if (dep.published !== true) return false;
  if (stored === 'proposed' || stored === 'draft' || stored === 'cancelled' || stored === 'completed' || stored === 'withdrawn') return false;
  if (dep.departure_type === 'private' || stored === 'on_request') return false;
  if (!isIsoDate(dep.end_date) || dep.end_date < today) return false;
  return true;
}

export function money(amount) {
  return Number(amount).toLocaleString('en-US');
}

/** "From $1,950 per person on shared departures" (or "From USD 1,950 …" once usd_confirmed). */
export function priceLabel(price, settings = {}) {
  const amount = Number(price?.amount ?? price?.reference_amount);
  const status = String(price?.price_status || '');
  if (!Number.isFinite(amount) || amount <= 0 || status === 'price_on_request' || price?.display_on_site === false) {
    return 'Price on request';
  }
  // "$" = USD (owner-confirmed). price_display_prefix (seed: "$") keeps the owner's exact wording; legacy: usd_confirmed → "USD ".
  const prefix = typeof settings.price_display_prefix === 'string' ? settings.price_display_prefix : (settings.usd_confirmed ? 'USD ' : '$');
  const value = `${prefix}${money(amount)}`;
  // Private-only products (category C) keep the production "from" figure without claiming a shared basis.
  return price?.basis === 'private_reference' ? `From ${value} per person` : `From ${value} per person on shared departures`;
}

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function parts(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d, wd: DAY[weekday(iso)] };
}
/** "Sat 5 Dec – Wed 16 Dec 2026" (year shown once when equal). */
export function formatRange(start, end) {
  const a = parts(start);
  const b = parts(end);
  const left = `${a.wd} ${a.d} ${MON[a.m - 1]}${a.y !== b.y ? ` ${a.y}` : ''}`;
  return `${left} – ${b.wd} ${b.d} ${MON[b.m - 1]} ${b.y}`;
}

export function statusText(statusKey, dep, settings = {}) {
  const min = toInt(dep.min_group_size, null);
  if (statusKey === 'open') {
    return min ? `Open — awaiting minimum ${min} travelers` : 'Open — group minimum to be confirmed';
  }
  if (statusKey === 'confirmed') return 'Confirmed — this departure will operate';
  if (statusKey === 'limited') return 'Limited — few places left';
  if (statusKey === 'sold_out') return 'Sold out';
  if (statusKey === 'closed') return 'Closed — no longer taking requests';
  return STATUS[statusKey] || 'Ask us';
}

export const LAST_MINUTE_CTA = 'Contact us for last-minute availability';
export function ctaFor(statusKey) {
  switch (statusKey) {
    case 'open': return 'Request a Place';
    case 'confirmed':
    case 'limited': return 'Join This Departure';
    case 'sold_out': return ''; // sold out: no booking CTA
    default: return 'Ask About Dates';
  }
}

/**
 * Whitelisted public projection. Never includes traveler data, internal notes,
 * approval metadata or proposed departures.
 */
export function publicDeparture(dep, tour, settings, today) {
  const st = computeStatus(dep, today, settings);
  const out = {
    id: dep.id,
    tour_slug: dep.tour_slug,
    tour_code: dep.tour_code,
    start_date: dep.start_date,
    end_date: dep.end_date,
    duration_days: dep.duration_days,
    date_label: formatRange(dep.start_date, dep.end_date),
    departure_type: dep.departure_type === 'private' ? 'private' : 'shared',
    min_group_size: toInt(dep.min_group_size, null),
    status: st.key,
    status_label: st.label,
    status_text: statusText(st.key, dep, settings),
    selectable: st.selectable,
    cta: ctaFor(st.key),
    price_label: priceLabel(dep.price || tour?.price, settings),
    arrival_option: dep.arrival_option || null,
    public_notes: String(dep.public_notes || ''),
    booking_window_closed: false,
    last_minute: false,
    manual_contact: false,
    advisories: religiousFlags(dep, settings.religious_calendar || {}).ramadan.map((p) => ({ type: 'ramadan', text: RAMADAN_COMPACT, period: p.name, state: p.state, period_label: periodLabel(p) })),
  };
  const lw = longTourWindow(dep, today, settings);
  if (lw.applies && lw.state === 'unknown' && ['open', 'limited'].includes(st.key)) {
    // Legacy count unknown inside the review window: visible, manual contact only — never a normal request-a-place flow.
    out.manual_contact = true;
    out.selectable = false;
    out.status_text = MANUAL_CONTACT_TEXT;
    out.booking_window_closed = lw.booking_window_closed;
    out.last_minute = lw.booking_window_closed;
    out.cta = lw.booking_window_closed ? LAST_MINUTE_CTA : CONTACT_CTA;
  } else if (lw.applies && lw.kind === 'long' && countStatus(dep) === 'unknown' && st.key === 'open' && toInt(dep.min_group_size, null)) {
    // Never imply a known count ("awaiting …") from unknown legacy data.
    out.status_text = `Open — minimum ${toInt(dep.min_group_size, null)} travelers to operate`;
  }
  if (lw.applies && lw.booking_window_closed && ['confirmed', 'limited'].includes(st.key) && !out.manual_contact) {
    // Final booking cutoff: separate from Closed. Status stays; normal selection off; last-minute contact instead.
    out.booking_window_closed = true;
    out.selectable = false;
    out.last_minute = true;
    out.cta = LAST_MINUTE_CTA;
  }
  const cap = toInt(dep.max_capacity, null);
  if (settings.show_public_capacity && cap !== null) {
    out.max_capacity = cap;
    if (['confirmed', 'limited', 'sold_out'].includes(st.key)) out.remaining_places = st.remaining;
  }
  if (settings.show_public_confirmed_counts && dep.public_counts_approved === true && countStatus(dep) === 'verified' && out.departure_type === 'shared' && out.min_group_size) {
    out.confirmed_text = `${Math.max(0, toInt(dep.confirmed_count, 0))} of ${out.min_group_size} travelers confirmed.`;
  }
  return out;
}

export function publicDeparturesFor(slug, departures, tour, settings, today) {
  return departures
    .filter((d) => d.tour_slug === slug && isListed(d, today, settings))
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .map((d) => publicDeparture(d, tour, settings, today));
}

/** Group-minimum guidance for a request (1, 2, 3+ travelers). */
export function groupMinimumNote(travelers, bookingType, min = null) {
  const n = toInt(travelers, 0);
  if (bookingType === 'private') return 'private';
  if (n <= 0) return 'unknown';
  if (!toInt(min, null)) return 'minimum_not_set';
  return n >= min ? 'meets_minimum' : 'below_minimum';
}

/**
 * Scheduled group rule: tours of 5+ days → min 6 / normal max 18.
 * Shared departures of 4 days or less → min 2, no standard maximum (owner decision 10 Oct 2026).
 */
export function groupRuleFor(durationDays, settings = {}) {
  const longDays = toInt(settings.group_rule?.long_tour_min_days, 5);
  if (toInt(durationDays, 0) >= longDays) {
    return { applies: true, min: toInt(settings.group_rule?.long_min, 6), max: toInt(settings.group_rule?.long_max, 18) };
  }
  return { applies: false, min: toInt(settings.group_rule?.short_tour_shared_min, 2), max: null };
}

/** A booking counts toward the minimum only when accepted AND payment is recorded as received. */
export function countsTowardMinimum(tr) {
  // Owner 10 Oct 2026 20:47: counts after acceptance by AfghanTours + the 25% deposit (or full payment) recorded as received.
  return ['accepted', 'confirmed'].includes(tr?.status) && paymentReceived(tr);
}
export function paymentReceived(tr) {
  return tr?.payment_received === true || ['payment_received', 'deposit_received', 'deposit_recorded', 'paid_recorded'].includes(tr?.payment_status);
}

/* ------------------------------------------------------------------ religious calendar */

export const RAMADAN_ADVISORY_TITLE = 'Ramadan Travel Advisory';
export const RAMADAN_ADVISORY_PARAGRAPHS = [
  'This departure takes place during Ramadan.',
  'AfghanTours remains open for business and tours continue to operate during Ramadan.',
  'Travelers should expect some adjustments to normal daily routines. Restaurant and shop opening hours may change, daytime meal arrangements may require additional planning, and some visits or activities may be scheduled differently around prayer times and the evening iftar period.',
  'Ramadan can also offer travelers a distinctive view of daily life in Afghanistan, particularly in the evenings when families and communities gather to break the fast.',
  'AfghanTours will plan the departure around the operating conditions and opening hours in effect at the time and advise confirmed travelers of any material itinerary adjustments.',
];
export const RAMADAN_COMPACT = 'Ramadan departure — tours continue to operate, with some adjustments to opening hours, meals and daily scheduling.';
export const EID_NOTICE = 'Eid operating period — standard scheduled departures are not available on these dates. If you need to travel during Eid, please contact AfghanTours to discuss a special arrangement.';
export const EID_REVIEW_CHECKLIST = ['guide', 'driver', 'vehicle_availability', 'hotels', 'domestic_transport', 'site_access', 'meals', 'local_operating_conditions', 'itinerary_feasibility'];
const EID_NAMES = { eid_al_fitr: 'Eid al-Fitr', eid_al_adha: 'Eid al-Adha' };

/** Inclusive overlap of two ISO date ranges. */
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return isIsoDate(aStart) && isIsoDate(aEnd) && isIsoDate(bStart) && isIsoDate(bEnd) && aStart <= bEnd && aEnd >= bStart;
}

/** Flatten the configured calendar into Ramadan periods and Eid five-day blocks. */
export function religiousPeriods(cal = {}) {
  const before = toInt(cal.eid_block?.days_before, 1);
  const after = toInt(cal.eid_block?.days_after, 3);
  const ramadan = [];
  const eid = [];
  for (const y of cal.years || []) {
    const r = y.ramadan;
    if (r && isIsoDate(r.start_date) && isIsoDate(r.end_date)) {
      ramadan.push({ kind: 'ramadan', name: `Ramadan ${y.year}`, year: y.year, start: r.start_date, end: r.end_date, state: r.state === 'confirmed' ? 'confirmed' : 'estimated', source: r.source || '' });
    }
    for (const kind of ['eid_al_fitr', 'eid_al_adha']) {
      const e = y[kind];
      if (!e || !isIsoDate(e.date)) continue;
      const start = addDays(e.date, -before);
      const end = addDays(e.date, after);
      eid.push({ kind, name: `${EID_NAMES[kind]} ${y.year}`, year: y.year, eid_date: e.date, start, end, key: `${kind}:${start}:${end}`, state: e.state === 'confirmed' ? 'confirmed' : 'estimated', source: e.source || '' });
    }
  }
  return { ramadan, eid };
}

/** Ramadan + Eid overlaps for a departure's FULL inclusive range. */
export function religiousFlags(dep, cal = {}) {
  const { ramadan, eid } = religiousPeriods(cal);
  const s = dep.start_date;
  const e = dep.end_date;
  return {
    ramadan: ramadan.filter((p) => rangesOverlap(s, e, p.start, p.end)),
    eid: eid.filter((p) => rangesOverlap(s, e, p.start, p.end)),
  };
}

/** Eid blocks apply to standard scheduled (shared) departures. Private/custom go to manual review instead. */
export function eidConflicts(dep, cal = {}) {
  if (dep.departure_type === 'private') return [];
  return religiousFlags(dep, cal).eid;
}

/** An Eid conflict is resolved only by an explicit admin override + note recorded for THIS block (date changes invalidate it). */
export function eidReviewed(dep, block) {
  const r = (dep.eid_reviews || {})[block.key];
  return !!(r && r.override === true && String(r.note || '').trim() !== '' && r.by);
}
export function eidUnresolved(dep, cal = {}) {
  return eidConflicts(dep, cal).filter((b) => !eidReviewed(dep, b));
}

/** Short "Mon 8 – Fri 12 Mar 2027 (expected)" label; estimated dates are never presented as final. */
export function periodLabel(p) {
  return `${formatRange(p.start, p.end)}${p.state === 'confirmed' ? '' : ' (expected)'}`;
}

/** Special (private/custom/specialist) request touching an Eid block → manual review. Free-text dates are scanned for ISO dates. */
export function eidManualReview(range, cal = {}) {
  const { eid } = religiousPeriods(cal);
  return eid.filter((b) => rangesOverlap(range.start, range.end || range.start, b.start, b.end));
}
