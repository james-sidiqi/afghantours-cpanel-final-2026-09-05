/**
 * Build-time access to the booking seed (data/booking/*.json).
 *
 * Authority model (see data/booking/README.md):
 *  - Repo seed = initial inventory + no-JS/SEO snapshot rendered into the static pages.
 *  - Production runtime = private store (/home/jamesbon/afghantours-private/booking/inventory.json),
 *    imported from this seed on first run and edited only through /manage/.
 *  - Pages fetch /booking/departures.php at runtime and replace the snapshot.
 */
import catalogJson from '../../../data/booking/tours-catalog.json';
import departuresJson from '../../../data/booking/departures.json';
import settingsJson from '../../../data/booking/settings.json';
import { publicDeparturesFor, priceLabel, todayIn } from './core.mjs';

export type Row = Record<string, any>;

export const bookingSettings: Row = settingsJson as Row;
export const bookingCatalog: Row = catalogJson as Row;
const departures: Row[] = (departuresJson as Row).departures;

/** Snapshot date = build day in Kabul. Runtime JS re-evaluates against the live endpoint. */
// Build snapshot date is pinned to the seed's `seed_as_of` so `npm run build` is deterministic (dist drift
// check). The live PHP feed and the client-side script always use the real Kabul date, and the client hides
// any snapshot row that has already started, so a stale snapshot never offers a past departure.
export const snapshotToday: string = process.env.BOOKING_TODAY || bookingSettings.seed_as_of || todayIn(bookingSettings.timezone || 'Asia/Kabul');

export function getCatalogTour(slug: string): Row | undefined {
  return bookingCatalog.tours.find((t: Row) => t.slug === slug);
}

export function getCategory(key: string): Row {
  return bookingCatalog.categories[key] || { label: '', summary: '' };
}

export function catalogByCategory(key: string): Row[] {
  return bookingCatalog.tours.filter((t: Row) => t.category === key && t.active !== false);
}

export function tourPriceLabel(slug: string): string {
  const t = getCatalogTour(slug);
  return t ? priceLabel(t.price, bookingSettings) : 'Price on request';
}

export function publicSnapshot(slug: string): Row[] {
  const t = getCatalogTour(slug);
  return publicDeparturesFor(slug, departures, t, bookingSettings, snapshotToday);
}

/** Rows in the legacy {tour_slug,date_start,date_end,status} shape for older consumers (public only). */
export function bookingDepartureRows(): Row[] {
  return bookingCatalog.tours.flatMap((t: Row) =>
    publicSnapshot(t.slug).map((d) => ({
      tour_code: t.code,
      tour_slug: t.slug,
      date_start: d.start_date,
      date_end: d.end_date,
      status: d.status_label,
      departure_id: d.id,
    })),
  );
}
