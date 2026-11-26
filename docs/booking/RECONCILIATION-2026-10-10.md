# Tour inventory reconciliation — production vs origin/main (2026-10-10)

Baseline: live afghantours.com audited read-only with curl on 2026-10-10 (`/workspace/afghantours-live-tours-2026-10-10.md`)
and origin/main `8f73e1f` (verified release candidate). Branch: `feat/tour-booking-calendar`.

## How tour data is generated (repo)

| Thing | Source | Renderer |
|---|---|---|
| Tour list / cards | `data/tours.csv` (+ `product_class`) | `src/pages/tours.astro` → `TourDirectory.astro` |
| Detail page | `data/tours.csv` + `src/content/tours/*.md` (long notes) | `src/pages/tours/[slug].astro` |
| Itinerary | `data/tour_itinerary.csv` (`overnight_hub` per day) | `[slug].astro` itinerary flow |
| Hotels | `data/hotel_properties.csv`, one standard hotel per overnight hub | `[slug].astro` accommodation |
| Inclusions | `data/tour_inclusions.csv` (ALL + per tour) | `[slug].astro` |
| Dates | **was** `data/tour_dates.csv` → **now** `data/booking/departures.json` | `[slug].astro` sidebar |
| Prices | `tours.csv price_from` → **now** `data/booking/tours-catalog.json` (`price` + `price_status`) | cards + sidebar |
| Images | `public/assets/images/featured-tours/<slug>/` (hero/overview/thumbnail + gallery) | unchanged |
| Inquiry | `TourInquiryModal.astro` + contact page form → `public/tour-inquiry.php` (PHP `mail()`) | extended, not replaced |
| Custom/specialist | `data/specialist_services.csv`, `return_journeys.csv`, `custom_journeys.csv` → `/specialist-services/*`, `/return-journeys/*`, `/custom-requests/`; old `/tours/<slug>/` = `public/tours/<slug>/index.html` stubs + `.htaccess` 301 | unchanged |

## Production vs main

| Topic | Production (live) | origin/main 8f73e1f | Decision on this branch |
|---|---|---|---|
| 13 tours, names, durations, itineraries, dates | same | same | kept |
| Prices Buzkashi $2,450 / Weekend $450 / Winter $2,100 / Summer $1,950 | shown "From $X" | "Price on request" | **production value kept as reference** (`price_status: reference_from_production`), shown "From $X per person"; James to approve/withdraw |
| Other 9 prices | shown | shown | kept as reference, flagged for review |
| Price basis | "From $X" on detail, "/ person" on cards | same | both now "From $X per person" (Part 8: listing = detail basis) |
| Labels / sections | flat list, "Cultural / Scenic" | Scheduled vs Private fixed, sections A–E | A–D per James's Part 2 |
| 8 custom pages | full pages under /tours/<slug>/ | 301 stubs → /custom-requests/, /specialist-services/…, /return-journeys/… | kept main's redirects **only because every destination page exists in the build** (validated in CI by `validate-booking-data.mjs` + `test-booking.sh`) |
| Noshaq $2,000 / Photography $2,850 / Scientific $4,500 | shown | destination pages are quotation-only | recorded as reference, **not displayed**; James to decide |
| Wakhan / Minaret-e-Jam | 404 | inactive | inactive (validated) |
| `.htaccess` | none on live | redirects present | unchanged; arrives with deploy |

## Date audit (inclusive: end = start + duration − 1)

| Departure | Dates | Days | Tour | Result |
|---|---|---|---|---|
| Summer Circuit | 2026-08-20 – 08-28 | 9 | 8 | ✗ (past; history) — expected end 08-27 |
| Central Afghanistan Discovery | 2026-09-12 – 09-19 | 8 | 7 | ✗ (past; history) — expected end 09-18 |
| **Winter Circuit** | **2026-12-05 – 12-17** | **13** | **12** | **✗ published, future — expected end 12-16. Not changed; James to approve fix in /manage/** |
| all other 17 rows | | | | ✓ (Buzkashi 2027-02-23 – 03-04 = 10 ✓) |
