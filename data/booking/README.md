# Booking inventory — data model and authority

This folder is the **single authoritative seed** for AfghanTours tour products (booking fields) and departures.
`data/tour_dates.csv` was retired on 2026-10-10; its 20 rows were imported into `departures.json` unchanged.

| File | What it holds |
|---|---|
| `tours-catalog.json` | 23 products: 13 tours (categories A/B/C), 8 custom/specialist services (D), 2 inactive (Wakhan, Minaret-e-Jam). Category, duration/nights, booking type (Scheduled Departure / Private Tour / Custom Journey / Specialist Service), group rule (5+ days: 6–18; ≤4 days: min 2, no standard max), private availability, operating window, reference price + `price_status`, legacy URL → current page for D. |
| `departures.json` | Every departure (history, published, proposed). Fields per spec Part 4. Seed counts are always 0. |
| `blackouts.json` | Configurable blackout / advisory periods (Eid estimates are `confirmed:false`). |
| `settings.json` | `usd_confirmed` (false → show `$`), minimum, limited-places threshold, public count/capacity switches, contact, customer wording. |

## Who is authoritative when

1. **Repo seed (this folder)** — reviewed in Git, validated in CI (`scripts/validate-booking-data.mjs`), rendered
   into the static pages at build time as a no-JS/SEO snapshot, and copied to `dist/booking/seed/` (web access denied by `.htaccess`).
2. **Private store (production)** — `/home/jamesbon/afghantours-private/booking/inventory.json`. On the first request
   `public/booking/lib/booking.php` imports the seed into it. **From then on the private store is the only source of truth**:
   `/manage/` (admin) edits it, `/booking/departures.php` (public JSON) and `/tour-inquiry.php` read it.
   Later seed changes are NOT re-imported automatically (admin edits are never overwritten). An admin can see the seed
   version and re-import only by deleting `inventory.json` deliberately.
3. **Static page snapshot** — what the HTML shows before JavaScript loads. Tour pages call `/booking/departures.php`
   and replace the snapshot with the live inventory; if the call fails they hide any date that has already started.

Traveler names/contacts live only in `<private>/booking/travelers.json` and `<private>/booking/inquiries.jsonl`, never in this
folder, the public endpoint, or `dist/`.

## Group size rules (controlling, 10 Oct 2026)

| Product | Minimum to operate | Maximum |
|---|---|---|
| Scheduled group tour, 5+ days | 6 confirmed travelers | normally 18 (per-departure exception only when approved, recorded in `group_exception_note`) |
| Scheduled / shared departure, 4 days or less (Weekend in Kabul, Panjshir) | 2 confirmed travelers | no standard maximum (product-specific only from approved data) |
| Private tour | 1 traveler, quoted separately | — |
| Custom Journey / Specialist Service | defined in the individual proposal | — |

Rules live in `settings.json → group_rule`; the validator and the PHP admin refuse other numbers without a recorded exception.

## Status model

Stored (admin) status: `proposed | draft | scheduled | on_request | closed | cancelled | completed`.
Public status is **computed** (`src/lib/booking/core.mjs` and the PHP mirror) and uses ONE vocabulary:
**Open — awaiting minimum N travelers** (N = the departure's real minimum) / **Confirmed** / **Limited** / **Sold out** / **Closed**.
Confirmed needs ≥ minimum **confirmed** travelers **and** operational approval — never automatic. Pending requests never count.
Cancelled, completed (past), private and proposed departures are internal states and never appear in the public feed.

**Booking status** (per traveler: requested / booking confirmed / cancelled) is stored separately from the departure status.
A booking can be confirmed while its departure is still Open; the admin "Booking confirmation" record shows tour, dates,
travelers, booking status, departure status at the time of booking, required minimum, the date the departure became
confirmed, amount paid, balance and due date.

## Dates

Inclusive: `end = start + (duration_days − 1)`. Mismatches in existing production dates are **flagged, not changed**
(`date_check.ok:false`). Proposed departures are exact by construction.
