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
 *  - Only confirmed travelers count. Pending inquiries do not.
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
};
export const PUBLIC_STATUSES = ['open', 'confirmed', 'limited', 'sold_out', 'closed'];

export const STORED_STATUSES = ['proposed', 'draft', 'scheduled', 'on_request', 'closed', 'cancelled', 'completed'];
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

/**
 * Compute the customer-facing status of a departure.
 * @returns {{key:string,label:string,selectable:boolean,remaining:number|null}}
 */
export function computeStatus(dep, today, settings = {}) {
  const stored = String(dep.status || '').toLowerCase();
  const min = toInt(dep.min_group_size, null); // null = minimum not set by the owner → never Confirmed
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
  if (min !== null && min > 0 && confirmed >= min && dep.operational_approval === 'approved') {
    if (remaining !== null && remaining <= threshold) return out('limited');
    return out('confirmed');
  }
  return out('open');
}

/** Public = published, not proposed/draft, and not ended. */
export function isPublic(dep, today) {
  const stored = String(dep.status || '').toLowerCase();
  if (dep.published !== true) return false;
  if (stored === 'proposed' || stored === 'draft' || stored === 'cancelled' || stored === 'completed') return false;
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
  const value = settings.usd_confirmed ? `USD ${money(amount)}` : `$${money(amount)}`;
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

export function ctaFor(statusKey) {
  switch (statusKey) {
    case 'open': return 'Request a Place';
    case 'confirmed':
    case 'limited': return 'Join This Departure';
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
  };
  const cap = toInt(dep.max_capacity, null);
  if (settings.show_public_capacity && cap !== null) {
    out.max_capacity = cap;
    if (['confirmed', 'limited', 'sold_out'].includes(st.key)) out.remaining_places = st.remaining;
  }
  if (settings.show_public_confirmed_counts && dep.public_counts_approved === true && out.departure_type === 'shared' && out.min_group_size) {
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
