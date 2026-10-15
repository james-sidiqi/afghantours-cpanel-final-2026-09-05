# Release status (verified 2026-10-15, 18:25–18:40 Kabul time, UTC+4:30)

Repository: https://github.com/james-sidiqi/afghantours-cpanel-final-2026-09-05 (public). Default branch: `main`.
**Live production baseline:** main @ `4e4d9f0edbfe458cd7de9da7dcb3a63944698f37` (PR #33 merge). Nothing from #36, #37 or #38 is deployed.

## 1. Pull requests (re-checked with `gh pr view`)
| PR | Head branch → base | Head SHA | State | Draft | Checks | Review | Mergeable |
|---|---|---|---|---|---|---|---|
| [#33](https://github.com/james-sidiqi/afghantours-cpanel-final-2026-09-05/pull/33) | fix-nav-images-2026-10-14 → main | 66bac57a | MERGED as 4e4d9f0e | – | qa ✅ | – | – |
| [#36](https://github.com/james-sidiqi/afghantours-cpanel-final-2026-09-05/pull/36) | image-swaps-safety-pricing-silkroad → main | bf8e6f8504d3a05d0dad7a2d2fe9e104a3957aba | OPEN | no | qa ✅ | none required/recorded | MERGEABLE / CLEAN |
| [#37](https://github.com/james-sidiqi/afghantours-cpanel-final-2026-09-05/pull/37) | remove-eid-and-gallery-images → main | e1aecaebfda5412c1673762cf0da8ea9e8e46d5a | OPEN | no | qa ✅ | none recorded | MERGEABLE / CLEAN |
| [#38](https://github.com/james-sidiqi/afghantours-cpanel-final-2026-09-05/pull/38) | t271-attractions-nuristan → **remove-eid-and-gallery-images** | see note* | OPEN | **yes** | qa (re-check) | none recorded | MERGEABLE / CLEAN into #37 |
| [#17](https://github.com/james-sidiqi/afghantours-cpanel-final-2026-09-05/pull/17) | feat/hesabpay-payments → main | a35bb2ff | OPEN draft, CONFLICTING | yes | – | – | **Out of scope; do not touch** |

\*#38's last *content* commit is `21a1ee062b3e51a7bdd7de150e556a12ff8837de`. The handoff added one docs-only commit on top (docs/handoff/ only, no site change). Run `gh pr view 38` for the current head.

Dependencies (from `git merge-base --is-ancestor`):
- #37 does NOT contain #36. Both branch from main 4e4d9f0e (#36 is 4 commits ahead, #37 is 6 ahead).
- #38 contains all of #37 (it is stacked: 15 commits ahead of main, 9 beyond #37). **#38 depends on #37.**
- #38 does NOT contain #36.

Conflicts (from `git merge-tree --write-tree`):
- #36 vs #37: 54 conflicting paths, **all under dist/** (generated). 0 source conflicts.
- #36 vs #38: 70 conflicting paths, **all under dist/**. 0 source conflicts.
- Resolution: never hand-merge dist/. Resolve the source, then `npm ci && npm run build` and commit the regenerated dist/ (CI "Dist drift check" fails if tracked dist/ ≠ build).

## 2. Combined local test branch
`release-combined-local` @ `f06b550036542151e9d954d576020b3dd9c1c8b8` = main 4e4d9f0e + #36 + #37 + #38 (21a1ee06), with dist rebuilt. **Local only, not pushed** (it was a box-only test branch). It is reproducible by merging the three PR heads into main and rebuilding. The deploy zip below is its dist diff.

## 3. Deploy package: release-deploy.zip
- URL: https://github.com/james-sidiqi/afghantours-cpanel-final-2026-09-05/releases/download/handoff-2026-10-15/release-deploy.zip
- Size 16,789,289 bytes; **344 files**; sha256 `fe3fd8a50a02488e1ac5793c80b75ac1bc7c7133562c8fb60211c19bf14fe62a` (re-computed 2026-10-15 and **matches** the earlier reported value)
- Paths are relative to the docroot. It contains **no** .htaccess, booking/, manage/, *.php or private config.
- Counting method: `git diff -M --name-status 4e4d9f0e f06b5500 -- dist` gives 271 M + 65 A + 9 R + 4 D.
  - In the zip: 270 M (271 minus dist/.htaccess, which is excluded) + 65 A + 9 R (new path) = **344** ✔
  - "13 obsolete" = 4 deleted + 9 old paths of renames. These are live files that are **not** in the zip; they are listed in manifests/stale-to-trash.txt and go to the cPanel Trash.
  - So the categories are not one partition of 344: obsolete files are outside the zip, and .htaccess is counted in M but shipped by hand.
- Reconciled 2026-10-15: release-combined-local was rebuilt with `npm run build` (tracked dist unchanged, 0 drift). All 344 zip files are **byte-identical** to the fresh build; the zip list equals the git-diff list exactly; stale-to-trash.txt equals the D + R-old set exactly.
- Per-file hashes: manifests/release-deploy-zip-manifest.sha256

## 4. Verification results
Re-verified 2026-10-15 ~18:27 Kabul time on release-combined-local f06b5500. **These are local build results; production was NOT tested.** Logs are in logs/.
| Check | Command | Result |
|---|---|---|
| Build | `npm run build` (plus postbuild sitemap and booking seed) | ok; 0 dist drift |
| Booking data | `node scripts/validate-booking-data.mjs` | pass |
| Booking core | `node --test scripts/booking-test/core.test.mjs` | pass |
| Booking system | `bash scripts/test-booking.sh` | pass |
| PHP lint | `php -l public/tour-inquiry.php` | pass |
| Policy | `node --test scripts/booking-test/policy.test.mjs` | pass |
| Internal links | `node scripts/check-internal-links.mjs` | 24,175 checked, 0 broken |
| Site integrity | `python3 scripts/site_integrity_audit.py . --strict` | pass |
| Content slugs | `node scripts/audit-content-slugs.mjs` | pass |
| Images | `node scripts/audit-images.mjs` | missing_count 0 |
| Sales funnel | `python3 scripts/audit-tour-sales-funnel.py` | pass |
| Inquiry entrypoints | `node scripts/audit-inquiry-entrypoints.mjs` | pass |
| Tour image identity | `node scripts/audit-tour-image-identity.mjs` | pass |
| WhatsApp | grep wa.me in dist HTML | 934 links, all https://wa.me/93780123456 |
| Sitemap | count `<loc>` in dist/sitemap.xml | 300 URLs |

Reported earlier but **not** re-verified here: all 33 .htaccess redirect rules gave one hop to a 200 under a local Apache test, and the visual QC screenshots (bundled in the handoff zip under qc-screenshots/). CI qa on GitHub was green for #36, #37 and #38 at 21a1ee06.
**Not tested:** production anything, including the live inquiry → mailbox delivery.
