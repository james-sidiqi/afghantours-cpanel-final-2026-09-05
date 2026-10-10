/**
 * AfghanTours booking core — pure functions shared by the Astro build (snapshot),
 * the validation script and the unit tests.
 *
 * The PHP runtime (public/booking/lib/booking.php) implements the SAME rules;
 * scripts/booking-test/parity.mjs + test-core.php check both agree on a fixture set.
 *
 * Rules (James's spec, Parts 3–5):
 *  - Shared group departures need >= min_group_size (default 3) CONFIRMED travelers
 *    AND operational approval before they become "Confirmed Departure". Never automatic.
 *  - Only confirmed travelers count. Pending inquiries do not.
 *  - Ended departures are "Completed" and never selectable. Started ones are "Closed".
 *  - Proposed/draft departures are never public.
 */

export const STATUS = {
  available_awaiting_minimum: 'Available — Awaiting Minimum',
  confirmed: 'Confirmed Departure',
  limited: 'Limited Places',
  sold_out: 'Sold Out',
  on_request: 'On Request',
  closed: 'Closed',
  cancelled: 'Cancelled',
  completed: 'Completed',
  proposed: 'Proposed (not public)',
};

export const STORED_STATUSES = ['proposed', 'draft', 'scheduled', 'on_request', 'closed', 'cancelled', 'completed'];
export const SELECTABLE = new Set(['available_awaiting_minimum', 'confirmed', 'limited', 'on_request']);

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

/**
 * Compute the customer-facing status of a departure.
 * @returns {{key:string,label:string,selectable:boolean,remaining:number|null}}
 */
export function computeStatus(dep, today, settings = {}) {
  const stored = String(dep.status || '').toLowerCase();
  const min = toInt(dep.min_group_size, toInt(settings.shared_min_group_default, 3));
  const cap = toInt(dep.max_capacity, null);
  const confirmed = Math.max(0, toInt(dep.confirmed_count, 0));
  const threshold = toInt(settings.limited_places_threshold, 2);
  const remaining = cap === null ? null : Math.max(cap - confirmed, 0);
  const out = (key) => ({ key, label: STATUS[key], selectable: SELECTABLE.has(key), remaining });

  if (stored === 'proposed' || stored === 'draft') return out('proposed');
  if (!isIsoDate(dep.start_date) || !isIsoDate(dep.end_date)) return out('closed');
  if (dep.end_date < today || stored === 'completed') return out('completed');
  if (stored === 'cancelled') return out('cancelled');
  if (stored === 'closed') return out('closed');
  if (dep.start_date <= today) return out('closed');
  if (dep.booking_cutoff && isIsoDate(dep.booking_cutoff) && today > dep.booking_cutoff) return out('closed');
  if (dep.departure_type === 'private' || stored === 'on_request') return out('on_request');
  if (remaining === 0) return out('sold_out');
  if (confirmed >= min && dep.operational_approval === 'approved') {
    if (remaining !== null && remaining <= threshold) return out('limited');
    return out('confirmed');
  }
  return out('available_awaiting_minimum');
}

/** Public = published, not proposed/draft, and not ended. */
export function isPublic(dep, today) {
  const stored = String(dep.status || '').toLowerCase();
  if (dep.published !== true) return false;
  if (stored === 'proposed' || stored === 'draft') return false;
  if (!isIsoDate(dep.end_date) || dep.end_date < today) return false;
  return true;
}

export function money(amount) {
  return Number(amount).toLocaleString('en-US');
}

/** "From $1,950 per person" (or "From USD 1,950 per person" once usd_confirmed). */
export function priceLabel(price, settings = {}) {
  const amount = Number(price?.amount ?? price?.reference_amount);
  const status = String(price?.price_status || '');
  if (!Number.isFinite(amount) || amount <= 0 || status === 'price_on_request' || price?.display_on_site === false) {
    return 'Price on request';
  }
  const value = settings.usd_confirmed ? `USD ${money(amount)}` : `$${money(amount)}`;
  return `From ${value} per person`;
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
  const min = toInt(dep.min_group_size, 3);
  if (statusKey === 'available_awaiting_minimum') {
    return (settings.wording?.awaiting_minimum || 'Awaiting group confirmation — minimum 3 travelers.').replace(/minimum \d+/, `minimum ${min}`);
  }
  if (statusKey === 'on_request') return 'On request — private departure';
  return STATUS[statusKey] || 'Ask us';
}

export function ctaFor(statusKey) {
  switch (statusKey) {
    case 'available_awaiting_minimum': return 'Request a Place';
    case 'confirmed':
    case 'limited': return 'Join This Departure';
    case 'on_request': return 'Request Private Tour';
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
    min_group_size: toInt(dep.min_group_size, 3),
    status: st.key,
    status_label: st.label,
    status_text: statusText(st.key, dep, settings),
    selectable: st.selectable,
    cta: ctaFor(st.key),
    price_label: priceLabel(dep.price || tour?.price, settings),
    arrival_option: dep.arrival_option || null,
    public_notes: String(dep.public_notes || ''),
  };
  const cap = toInt(dep.max_capacity, null);
  if (settings.show_public_capacity && cap !== null) {
    out.max_capacity = cap;
    if (['confirmed', 'limited', 'sold_out'].includes(st.key)) out.remaining_places = st.remaining;
  }
  if (settings.show_public_confirmed_counts && dep.public_counts_approved === true && out.departure_type === 'shared') {
    out.confirmed_text = `${Math.max(0, toInt(dep.confirmed_count, 0))} of ${out.min_group_size} travelers confirmed.`;
  }
  return out;
}

export function publicDeparturesFor(slug, departures, tour, settings, today) {
  return departures
    .filter((d) => d.tour_slug === slug && isPublic(d, today))
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .map((d) => publicDeparture(d, tour, settings, today));
}

/** Group-minimum guidance for a request (1, 2, 3+ travelers). */
export function groupMinimumNote(travelers, bookingType, min = 3) {
  const n = toInt(travelers, 0);
  if (bookingType === 'private') return 'private';
  if (n <= 0) return 'unknown';
  return n >= min ? 'meets_minimum' : 'below_minimum';
}
