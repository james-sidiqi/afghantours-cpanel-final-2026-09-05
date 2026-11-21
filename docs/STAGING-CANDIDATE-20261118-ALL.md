# AfghanTours staging candidate — consolidated 18 November 2026

## Scope

This branch includes the integrated content and photo work from PR #55 and the Activities page layout change from PR #56. PR #55 already contains the owner photo choices requested again in PR #57, so the older photo paths from PR #57 are deliberately not cherry-picked.

### In the staging candidate

- Owner-supplied sitewide photos, page heroes and galleries, image normalization, duplicate/retirement handling, and Balkh page/photo updates brought together in PR #55
- Province/hotel popup image fixes and photographic cultural/culinary/activities cards (including the Food & Culture card work from PR #54 consolidated by #55)
- Food & Culture harvest edits and redirects: Afghan-grown almonds; nationwide pine-nut context; Kunduz melon consolidated with Melons; Badghis pistachio forest information under Pistachios; approved vineyard gallery-only use; dried mulberries with white hero and dark gallery
- Haji Aziz Bakery storefront owner image as culinary listing/hero (owner-haji-aziz-hero.webp), replacing the former hero/card selection
- Traditional Chainaki decorated teapot image as listing/hero (gallery/01.webp), and only the second teapot photo in the visible gallery; retaining the first file as a source asset is intentional
- Activities grid with nine cards in CSV sort order: Horse Riding, Cycling, Birding in the third desktop row, without a separate “Also available” section
- Shared build, source image-alias and generated-asset checks inherited from PR #55

### Excluded until separately integrated

- PR #51 Trip Planner M1, PR #52 private pricing M2; neither is part of this staging website package
- PR #17 disabled HesabPay work; unrelated/stale open PRs should not be merged automatically
- No live PHP configuration, live email delivery, existing booking/manage data, private files, directory privacy, production publishing, or payment enablement

## Deploy instructions

Build from the exact validated candidate commit and package with scripts/release/package.py in full static-site mode. Extract only after backing up staging, and preserve existing staging Directory Privacy, noindex/robots.txt behavior, .htaccess, PHP, booking/manage, server configuration, and files outside the managed static release.

The ZIP contains static pages, media, JS/CSS, sitemap and version metadata only; it does not create or replace PHP entrypoints. Verify the GitHub CI qa result and archive SHA-256 and check /version.json against the intended commit before considering production.
