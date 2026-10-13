# Asset cleanup round 2, 13 Oct 2026 (base main d76caa8)

Round 1 (PR #31) deleted 135 files and merged 1 of the 338 that James marked X. It kept the other **202** because they were referenced. James's rule for round 2 is that his X stands even when a file is in use. This PR removes all 202.

| Class | Count | What happened |
|---|---|---|
| (a) no references | 103 | Deleted. 101 had no reference at all and the build is unchanged without them. 2 had only stale non-rendered refs (`data/page_assets.csv` row and an unused `afghanistan-map` fallback), which were removed. |
| (b) duplicate | 97 | References repointed to the kept copy (exact byte duplicate, or a perceptual duplicate checked by eye). Where the kept copy was already in the same gallery, or the tile was auto-listed from a folder, the duplicate entry/tile was dropped instead, so no gallery shows the same photo twice. |
| (c) in use, rejected | 2 | `edrees-and-tourist-nuristan-side-of-road.webp` was replaced with James's `edrees-tourist-breakfast-nuristan.webp`: same guide, same traveller, same Nuristan trip. `sightseeing/historical/02.webp` had no honest match, so its tile was dropped from the /activities/sightseeing/ gallery. |
| (d) unresolved | 0 | |

Per-file usage (pages, role, source file:line) and the decision for each file are in `docs/asset-cleanup-round-2-decisions-2026-10-13.csv`.

Code and data changes needed so pages keep a correct image after the deletions:
- `src/lib/images.ts` getAttractionImage: falls back to the CSV `card_image`/`hero_image` when `attractions/<slug>/hero.webp` is missing. This affects only Balkh, Sakhi Shrine and Taq-e Zafar; it stops nearby-attraction cards from showing the placeholder.
- `src/lib/hubCatalog.ts` hubGallery: lists only gallery files that exist. This drops the deleted hub tiles, plus already-missing Faizabad/Jalalabad/Ghazni/Mazar entries.
- `data/culinary_experiences.csv`: new `hero_image` column, filled for kunar-trout and ghazni-palaw only.
- `src/content/config.ts`: the food schema accepts `gallery_images`. Only kabuli-pulao.md uses it, to keep its two existing gallery tiles.
- `sambosa-pastry.md` sets its hero to the kept samosa copy.
- Gudiparan/Kaftar/Pahlawani galleries and the diaspora return-journey gallery drop an entry that duplicated another image in the same gallery.

Not touched: inquiry, pricing and booking code. In `data/tours.csv` and `tours_featured.csv`, only image-path cells changed, and validate-booking-data plus the booking tests pass.
