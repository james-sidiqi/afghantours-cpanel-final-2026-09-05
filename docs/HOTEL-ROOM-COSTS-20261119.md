# AfghanTours hotel supplier costs — 19 November 2026

## Supplier-only data

The authoritative room-level cost input is `data/hotel_rooms.csv`. It contains **43 room types at 21 properties in eight hub cities**, with room identifiers, room type, maximum occupancy, source descriptions/photos, nightly supplier costs in AFN and USD, and active flags. The conversion for each supplied rate is exactly **65 AFN = USD 1**.

The `nightly_sell_price_usd` column and **all 43 values have been removed**. No hotel selling prices are to be calculated, stored, advertised, or reused from this cost-input data during the supplier-cost collection stage.

## Supplier cost reconciliation

* 42 existing USD supplier costs already matched the owner-supplied rates.
* The one corrected cost is Kabul Grand Hotel suite room 2: **14,300 AFN / USD 220** (previous USD cost was 180).
* All existing identifiers, capacities, room types and photographs remain unchanged.
* A room type with two double beds still retains the explicitly supplied `max_occupancy=2`; do not infer or increase capacity from the bed count.

## Verification needed before supplier prices are considered final

* Confirm that each amount is an actual AfghanTours supplier/net booking rate (not a walk-in or advertised retail rate), with quote date, supplier contact, taxes and breakfast/heating/air-conditioning inclusions.
* Verify deposit and cancellation costs, seasonal changes, and contracted room availability.
* Reconcile earlier Kandahar hotel ranges (Dubai Inn fan versus AC, Continental Guesthouse categories) to the correct room records; do not overwrite specific room rates with an unmatched quote.
* Confirm rural/provincial accommodation coverage outside the eight hubs.

The public-facing hotel property's `price_range` field (relative $/$$/$$$ category) is separate display metadata and was not changed here. This document authorizes **supplier-cost inputs only**, with overhead, markup, margin, FX allowance, and payment fees deferred to later pricing work.

This update is stacked on the November 19 hub showcase branch and does not modify production or staging servers.
