# Evening image and homepage carousel update — 17 November 2026

Built locally for staging. No hosting deployment performed.

## Homepage tour selector

Updated only src/components/FeaturedTours.astro. Existing --font-display, --font-body, --at-gold-text and spacing tokens are reused. Titles are 16px/700 with 1.25 line height and normal word wrapping. Category labels are 9.5px/700 with 0.65px tracking; combined booking categories wrap between intact labels. Prices use a 12px emphasized amount and 11.5px supporting text. The copy has 14px padding, flex-column layout and bottom-aligned price areas. Images remain 104px high; desktop/tablet cards are 240px wide; mobile cards occupy 80% of the rail (about 1.27 cards visible), with native horizontal touch scrolling and scroll snapping.

All original tour titles, labels, prices, images, links, buttons, featured-panel content, panel typography and interaction JavaScript are unchanged. No dependencies or global heading styles changed.

Carousel browser verification passed at 1440, 1024, 768, 390 and 320px: consistent card dimensions, title sizes and wrapping, no text overflow, horizontal scrolling, selector activation, preview modal, itinerary link and Escape dismissal. Native touch swiping passed at 390 and 320px. Before/after data and panel computed-style snapshots match.

Files: src/components/FeaturedTours.astro; scripts/verify-home-carousel.mjs; scripts/fixtures/carousel-before-20261117.json; generated dist output.

## Owner image and content changes

Removed Chicken Kabuli and Paktika Livestock Markets & Kuchi Culture from all generated content/cards/links. Reconfirmed Ouzi is absent. Former URLs redirect to the applicable category. The separate Kuchi Nomads page remains and uses the owner-supplied nomad photos.

Afghan Grapes uses the supplied grapes photo for card and hero. Glassblowers uses the furnace photo for card/hero and the finished glassware as its gallery. Removed the original Wakhan Corridor view 2 (gallery-1.webp); later view numbers naturally shift. Fishing uses the newly supplied fishing.webp, converted from JPEG bytes into actual WebP.

Added other matching owner photos to Alingar, Badakhshan, Band-e-Amir, Wazir Akbar Khan Hill, Chilzina, Farah Citadel, Ahmad Shah Durrani's tomb, Chicken Street, sightseeing, birding, Haji Aziz Bakery, Kuchi Nomads, bolani, Rosh, Sheer Chai and Western Afghanistan. Explicitly labelled new heroes replace earlier selections; other additions enter curated galleries. Same-format duplicates reuse existing assets or the largest version; distinct edits remain.

34 import records; original inputs preserved unchanged and backed up outside public/. Five redundant/removed site files archived outside the active site. The lower-resolution duplicate bolani photo and thumbnail-labelled Buddha photo remain preserved but unused. Exact mappings, hashes and archive receipts are in reports/evening-changes-20261117/actions.json.

## Validation and delivery

npm run build and source image-policy tests passed. Static verification checked 332 HTML pages and 752 unique image URLs, with zero missing images. All newly selected hero/gallery mappings, food/cultural cards, removed content, redirects, input hashes, archive hashes and prior owner changes passed. Browser image validation passed 48 desktop/iPhone route cases. This is static visual validation; PHP/mail/booking backend tests were not run.

Reusable checks: scripts/verify-evening-images.mjs and scripts/fixtures/evening-image-changes-20261117.json. The earlier owner-image fixture was updated for the newly supplied Haji Aziz hero. Screenshots and JSON results are saved under reports/evening-changes-20261117.
