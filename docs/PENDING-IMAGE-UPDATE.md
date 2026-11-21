# Pending photo update from the 7pm 17 November folder

Completed locally; no hosting deployment performed.

- street-kid-brothers.webp: added to Activities / Sightseeing / street life. The explicit Sightseeing list now renders all ten photos rather than silently dropping the tenth image.
- mountain-access.webp: replaces the Expedition-Grade Mountain Access card image on /transportation/.
- safety and route planning.webp: replaces the Safety & Route Planning section photo on /faq/.
- panjshir-tanks.webp: added to the Massoud Mausoleum attraction gallery. Its hero remains unchanged; the same hero is not duplicated in the gallery.
- specialist-travel.webp: replaces the Specialist Travel section photo on /faq/.

All five original WebP files were preserved byte for byte and their SHA-256 hashes verified against the inputs and private backups. Previous replacement photos are backed up outside public/. Seven other pending-folder photos were not assigned because no placements were specified.

Files changed: data/attractions_master.csv; src/content/activities/sightseeing.md; src/data/ownerImageSelections.json; image asset/gallery inventories; src/pages/[slug].astro; src/pages/transportation/index.astro; src/pages/activities/[slug].astro; existing image-browser fixture; five public images and generated dist files.

Validation: npm run build passed. All 332 HTML pages and 754 distinct image URLs checked with zero missing images. Copy and links on all four affected pages match the previous version. Twelve browser cases passed at 1440, 768 and 390px, including the exact five image placements, complete galleries, image loading and FAQ accordion interactions. Saved mobile screenshots are included in the GitHub release. No backend/PHP files changed or tested.

Detailed receipts: reports/pending-images-20261117/actions.json, static-verification.json and browser-results.json.
