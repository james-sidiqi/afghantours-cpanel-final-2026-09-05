# AfghanTours — November 23 screenshot review

**Scope:** the November 23 iPad screenshots of Specialist Services, Travel Hubs, Hiking, Shopping, Fishing and Skiing.

**Base branch:** `release/staging-combined-20261122` (PR #64). All changes are confined to this follow-up PR and generated tracked `dist/`, not staging or production cPanel.

## Fixes

1. Specialist Services previously used a solid `#101820` background with no hero art. It now uses the existing Kabul city hero image with a dark gradient overlay on desktop and mobile.
2. Travel Hubs previously showed `hub.image` in the banner but `hub.cardImage` in the selectable city card and selected-hub panel. Use `hub.cardImage || hub.image` for the banner as well, so all three agree when a city such as Herat is selected.
3. Activity galleries previously emitted plain `<img>` elements, which did not trigger the site's shared `ImageLightbox`. They now use accessible buttons, responsive thumbnails and data-lightbox attributes; clicking/tapping or pressing Enter on a focused thumbnail opens the full-screen image; Escape closes it. Existing standalone lightbox markup is preserved.
4. Fishing: the older alpine river fishing image `/assets/images/experiences/activities/fishing/gallery/02.webp` already existed but was omitted by explicit gallery curation. It is restored alongside the Panjshir photo.
5. Shopping: the Majid Mall image was present but its space appeared blank/delayed on the iPad. The first four gallery thumbnails now load eagerly with low fetch priority, while remaining images are lazy; the image is retained and the gallery can be enlarged. This improves loading priority, but cPanel serving/cache errors must still be checked after staging deployment.
6. Skiing: `.../page-assets/activities/skiing/02.webp` and `.../experiences/activities/skiing/gallery/03.webp` portray the same man with raised ski poles. Display only the approved experiences image, and keep the original files on disk.

## Verification

- Regenerated `dist/` from source via a temporary self-removing GitHub Action, not by editing generated HTML.
- Added `scripts/browser-test/staging-visual-qa-nov23.spec.mjs` for hero imagery, selected hub photo consistency, keyboard/touch gallery, restored fishing photo, Mall photo load, and skiing deduplication.
- Spot-check on staging Safari/iPad and a desktop browser, including opening and closing a gallery lightbox and switching to the Herat hub.

**Deployment:** merge into PR #64's combined staging source only after final CI passes, build a **new staging-safe release**, preserve `.htaccess`, PHP, booking/manage, existing staging access protection and robots/noindex, then verify `/version.json`. Previous ZIPs don't contain these fixes. No production deployment is requested.
