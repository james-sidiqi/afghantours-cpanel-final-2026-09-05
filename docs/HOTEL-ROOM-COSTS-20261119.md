# Hotel room costs — 19 November 2026

Source of truth: `data/hotel_rooms.csv`.

The owner supplied 43 room rows across 21 properties in eight hub cities, with nightly supplier costs in both AFN and USD, using exactly **65 AFN/USD**. The file retains room slugs, unique room IDs, room type, max occupancy, descriptions, photos, is_active and the pre-existing USD selling-price column. The explicit **nightly_cost_afn** column is placed adjacent to nightly_cost_usd so the source does not depend on a future currency assumption.

## Changes and review

* 42 of 43 existing supplier USD costs already matched the supplied table and were preserved.
* Kabul Grand Hotel, suite room ID 2: supplier nightly cost corrected from $180 (11,700 AFN) to **$220 (14,300 AFN)**.
* Its current `nightly_sell_price_usd` remains **$220**, producing a zero gross margin before overhead, payment charges and taxes. The selling price requires owner approval, and must not be automatically increased.
* Other selling prices and occupancy assignments are unchanged. Values like `two_doubles` with occupancy 2 have been preserved exactly as approved, without guessing capacity from bed counts.

## Publication boundary

The cost columns represent supplier inputs, **not customer-facing tariffs**. The current static hotel pages use hotel metadata/images rather than advertising these room costs. The PHP quotation desk or a future itinerary calculator must use the appropriate source field, explicit FX allowances, and approved margin policies. The per-room public selling rates are not approved by this update.

This change is stacked on the November 19 hub showcase branch. It does not modify existing staging PHP, booking records, cPanel configuration, or a production website.
