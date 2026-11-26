# Non-image QA — 1 November 2026

Baseline: cPanel `main` at `f12d5257e8730f51ba8dd77bda2f15494aa71930`. Scope and owner follow-up: [office handoff](OFFICE-HANDOFF-2026-11-01.md).

## Verification

Local checks used Node 20.20.2, PHP 8.3.6 CLI/development server and Chromium 153. Tests use isolated temporary booking stores, captured mail and mocked browser submissions. No real traveler message, booking mutation or hosting operation was performed.

| Check | Result |
|---|---|
| Clean-cache Astro build | Passed; 308 generated pages, 326 total HTML files including copied/static redirect pages |
| Sitemap | 299 canonical URLs; 27 redirect/noindex HTML pages excluded |
| Booking JavaScript core | 139 passed |
| Booking/legal policy tests | 25 passed |
| PHP core | 733 passed |
| HTTP booking/inquiry/admin integration | 164 passed |
| Inquiry authorization guards | 14 passed |
| Inquiry mail suite | Zero failures; mail captured locally |
| Release packager | Eight tests passed |
| Internal links | Zero broken targets |
| Strict site integrity | Zero errors/warnings; 13 informational normalization notes |
| Content slugs | Zero duplicates |
| Image reference audit | Zero missing references |
| Retired routes | Nine host-relative static redirects; canonical links retained, source Apache rules synchronized; no retired sitemap/public links |
| Map | 87 active attractions; retired attractions removed, source JSON rebuilt before Astro |
| Sales funnel / inquiry entrypoints / tour image identity | Passed |
| Browser regression suite | 30 passed across 390px, 820px and 1440px viewports |
| Visual review | Food and contact pages inspected at 390px and 1440px; corrected the visible contact anti-spam field |
| Venue worksheet fixtures | Pending rows accepted without publication; incomplete confirmations and invalid dates rejected |
| Image comparison helper fixtures | SAME/ADD/UNMAPPED results, unsafe ZIP rejection, no report overwrite; no actual import |

The browser suite covers explicit success/reference and false-success handling, preservation of entered details on failure, dialog keyboard behavior, Weekend arrival fields, legacy specialist/return parameters, canonical experience CTAs, light-page navigation, consolidated-food redirects, Baghlan card/popup image loading, horizontal overflow and JavaScript exceptions. Browser submissions cannot send email.

## Image and operational preservation

- All **1,254 tracked files in `public/assets/images/`** retain their baseline Git blob hashes.
- All **1,254 tracked files in `dist/assets/images/`** retain their baseline Git blob hashes.
- No new image files, replacement images, image renames or binary deletions are part of this branch.
- `data/booking/` prices, rules, dates and inventory source files are unchanged. No live inventory is replaced.
- Eight retired content documents are archived under `src/content/_inactive/`; their original image files remain intact.
- Nine venue rows remain pending. No street address, restaurant or seasonal meeting point is invented or published from those rows.

## Boundaries and remaining decisions

Booking-data validation succeeds with 13 existing operating/history warnings. They include estimated religious dates, two historical duration mismatches, ended October departures and unknown traveler counts. The office handoff identifies the relevant records, especially the December Winter Circuit review. These are owner/live-data decisions, not instructions to rewrite history or fabricate counts.

Repository tests do not establish that cPanel is updated, staging protection works, real mail is delivered or payment processing is enabled. Live `tour-inquiry.php` and `manage/index.php` require a separate comparison, backup and approval; the static ZIP excludes both. Final attraction imagery remains the owner's MacBook work. Payment PR #17 remains outside this work.

The PR's exact-head GitHub CI result is the final merge gate. No merge, release publication or hosting deployment is claimed by this report.
