# Owner website changes — 17 November 2026

Applied locally; not published or deployed.

- Removed the entire Ai-Khanoum attraction, Ouzi food entry and Gardens of Logar food entry. Old URLs redirect to their category pages.
- Removed Kunduz old view 3 and Koh-e-Baba old view 2.
- Applied the requested hero/card/gallery selections for Kabob, Chainaki, Haji Aziz Bakery, Minaret of Jam, Kunduz, Badghis pastures, hiking, trekking and Badghis pistachios. Promoted heroes are excluded from their galleries where requested. Kabob retains its previous hero in the gallery.
- Renamed the existing Ancient City of Balkh attraction to Abu Nasr Khwaja Parsa Shrine (Green Mosque / Rauza-e-Sharif), preserving its URL. Added Farah Citadel aliases Shahr-e Kohna / Qala-e Fereydun.
- Created /cultural-experiences/ancient-city-of-balkh/ with links to all five requested attractions.
- Created /attractions/balkh-bala-hisar-ancient-walls/ with the supplied walls/tower photos. Added supplied photos to Haji Piyada, Rabia Balkhi and Rumi galleries.

## Photo preservation

Imported 18 image records as valid WebP. Original input files remain unchanged and are backed up in unused-archive/owner-changes-20261117/input-originals. Ten obsolete site images were archived outside the active site, not destroyed. Hashes and exact mappings are in reports/owner-changes-20261117/actions.json and archived-images.json.

The supplied balkh-walls.webp shows a mountain valley and was left unassigned. alingar-valley.webp has no requested placement. The alternate pista-tree-badghis.png was left unused in favor of the requested larger WebP. The supplied treking.webp is used for trekking.

## Validation

npm run build and source policy checks passed. Static validation checked 328 HTML pages and 733 unique image URLs with no missing files. All requested hero/gallery mappings, redirects, five Balkh links, import formats and archive hashes passed. Browser validation passed 52 route/viewport cases at desktop and iPhone widths, including galleries and image loading. PHP/backend production tests were not run because PHP CLI is unavailable; these changes concern static content and images.

The reusable browser test is scripts/verify-owner-updates.mjs with scripts/fixtures/owner-image-changes-20261117.json. Detailed test outputs and mobile screenshots are in reports/owner-changes-20261117.
