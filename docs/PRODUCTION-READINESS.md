# AfghanTours cPanel — Production Readiness

**Verified:** 2026-09-25 23:04:06 +0430 (Asia/Kabul)  
**Repo:** `james-sidiqi/afghantours-cpanel-final-2026-09-05`  
**Artifact main SHA:** `baa5a2801a20b3cfd8e156f3a81773c3fe88a763`  
**Docs tip SHA:** `28b43acd9a4685af4e4047492888b035bccf5cbc`  
**Production deploy:** **NOT performed** — artifact verified only; awaiting James cPanel authorization

## Verdict

**PRODUCTION ARTIFACT VERIFIED — READY FOR JAMES CPANEL DEPLOYMENT AUTHORIZATION — NOT DEPLOYED**

Engineering P0 = **0** · P1 = **0** (one P1 found during verification and fixed before this record — see below)

## P1 found and fixed during this verification

| Item | Detail |
|------|--------|
| Issue | `/destinations/` linked to `/regions/wakhan-northeast/`, which does not exist (only five regions published from `data/regions.csv`) |
| Fix | PR [#13](https://github.com/james-sidiqi/afghantours-cpanel-final-2026-09-05/pull/13) — remove phantom region card; 301 old URL → `/destinations/badakhshan/`; Wakhan geography kept via Badakhshan + `/attractions/wakhan-corridor/`; inactive Wakhan **tour** products remain unpublished |
| Merge SHA | `2d4ad7a84772807db53f96e5bca9888ca0ad748c` |

## Build

| Item | Result |
|------|--------|
| `git fetch` / HEAD | `2d4ad7a84772807db53f96e5bca9888ca0ad748c` (= `origin/main` at verification time of artifact; docs commit may tip-advance) |
| Working tree | clean; `npm ci` + `npm run build` reproduced tracked `dist/` with **zero drift** |
| `npm ci` | exit **0** |
| `npm run build` | exit **0** — Astro **307** pages; postbuild sitemap **300** URLs |
| `index.html` under `dist/` | **315** (307 Astro routes + 8 legacy Moved-permanently stubs under `/tours/`) |
| Build / ZIP stamp | 2026-09-25 23:04:06 +0430 |
| Tracked `dist/` drift | **PASS** |

## CI (artifact tip)

| Item | Result |
|------|--------|
| Run | [CI run 36174054457](https://github.com/james-sidiqi/afghantours-cpanel-final-2026-09-05/actions/runs/36174054457) |
| Head SHA | `2d4ad7a84772807db53f96e5bca9888ca0ad748c` |
| Conclusion | **success** |

## Local CI-equivalent audits (this verification)

| Check | Command | Exit | Result |
|-------|---------|-----:|--------|
| PHP lint | `php -l public/tour-inquiry.php` | 0 | No syntax errors detected |
| Site integrity `--strict` | `python3 scripts/site_integrity_audit.py . --strict` | 0 | **ERROR=0 WARN=0 INFO=13** (itinerary hub-normalization notes only) |
| Content slug audit | `node scripts/audit-content-slugs.mjs` | 0 | 324 checked, **0** duplicates |
| Image audit | `node scripts/audit-images.mjs` + missing_count==0 gate | 0 | **missing_count=0** / 627 refs |
| Tour sales funnel | `python3 scripts/audit-tour-sales-funnel.py` | 0 | PASS criteria met |
| Inquiry entrypoints | `node scripts/audit-inquiry-entrypoints.mjs` | 0 | **10/10** PASS |
| Tour image identity | `node scripts/audit-tour-image-identity.mjs` | 0 | 13 active, **0** failures |
| Dist drift | `git add -f dist/` then cached diff quiet | 0 | `dist/` matches build |

Informational integrity notes were **not** changed (per release policy).

## Contact / inquiry (static verification only — no live send)

| Lock | Verified |
|------|----------|
| Email | `info@afghantours.com` (JSON-LD, mailto, PHP `INQUIRY_TO` / From) |
| Phone | `+93 780 123 456` / `tel:+93780123456` |
| WhatsApp | `https://wa.me/93780123456` |
| Flows | `scheduled`, `private-fixed`, `custom`, `activity`, `specialist`, `return`, `general` |
| `dry_run` | Allowed only on CLI / localhost / `127.0.0.1` / `::1` or matching `AFGHANTOURS_DRY_RUN_KEY` — production hosts reject open dry_run |

## Critical customer routes

| Requested | Artifact result |
|-----------|-----------------|
| `/` | PASS |
| `/tours/` | PASS |
| `/custom-requests/` | PASS |
| `/specialist-services/` | PASS |
| `/return-journeys/` | PASS |
| `/hubs/` | PASS |
| `/attractions/` | PASS |
| `/cultural-experiences/` | PASS |
| `/activities/` | PASS |
| `/regions/` | PASS for `/regions/central|north|west|south|east/`; no `/regions/index.html` — listing via `/destinations/#regions` |
| `/provinces/` | Canonical `/destinations/#provinces` + `/destinations/{slug}/` (no `/provinces/` tree) |
| `/hotels/` | PASS |
| `/transportation/` | PASS |
| `/food-culture/` | PASS |
| `/about/` `/faq/` `/safety/` `/contact/` `/privacy/` `/terms/` | PASS |

Inactive Wakhan / Minaret-e-Jam **tour products** remain unpublished; attraction pages (`/attractions/wakhan-corridor/`, `/attractions/minaret-of-jam/`, etc.) remain.

Home/footer/nav spot-check: links resolve to the canonical paths above.

## Redirects

- `dist/.htaccess` present; rewrite targets exist; no trivial self-loop pairs in static parse.
- Legacy `/tours/` specialist/return/custom stubs exist as **Moved permanently** HTML + matching 301s — stubs do not override live tour content.
- Culinary + hub slug aliases → canonical culinary/hub URLs.
- **New (P1):** `/regions/wakhan-northeast/` → 301 `/destinations/badakhshan/`.

## Deployment artifact hygiene

Searched `dist/` for `127.0.0.1`, `localhost`, `/workspace/`, `github.dev`, `codespaces`, `TODO`, `FIXME`:

- **Only hits:** intentional dry_run allowlist in `tour-inquiry.php`. Not customer-facing preview URLs.
- No `*.map` source maps; no `node_modules/` or `src/` under `dist/`; no private keys / obvious secrets.

## Production ZIP (not uploaded)

| Field | Value |
|-------|-------|
| Path | `/workspace/afghantours-cpanel-release-2026-09-25.zip` |
| Source main SHA | `2d4ad7a84772807db53f96e5bca9888ca0ad748c` |
| SHA-256 | `7d2965c133c8111a95d567c3170ed99a2185ba1fc2e07d22c2d7b0438f4ea9a0` |
| ZIP size | 510.04 MB (534,818,132 bytes) |
| File count | **1,943** files |
| Uncompressed | 523.87 MB (549,317,166 bytes) |
| Contents | Clean copy of `dist/` per `docs/DEPLOYMENT-CPANEL.md` (upload document-root contents) |
| ZIP exclusions | `.git/`, `node_modules/`, `src/`, workspace reports; also omitted leftover `tour-inquiry.php.before-route-about-fix-20260903-202411` (still tracked under `public/` → `dist/` as P2 hygiene only) |

## Remaining P2 / informational (non-blocking)

- Integrity INFO×13: repeated overnight hubs in itinerary CSV (normalization notes).
- Funnel coverage gaps (some attractions/food/hotels/destinations without direct tour overnight mapping) — accepted by funnel PASS criteria.
- Tracked leftover PHP backup filename under `public/` / `dist/` — excluded from this ZIP; optional later cleanup (not a content/design change).
- Prior RC backlog (FAQ SoT, empty custom CSV, optional hotel galleries, restaurant sitemap coverage) — see `docs/RELEASE-CANDIDATE-REPORT.md` and `docs/NEEDS-*`.

## Deployment procedure (from `docs/DEPLOYMENT-CPANEL.md`) — James only

1. Preconditions: RC docs complete; `main` QA green; backup tag retained (e.g. `cpanel-backup-2026-09-24`); James review of P0/P1 and NEEDS-* docs.
2. On clean `main`: `npm ci && npm run build` (or use the verified ZIP above from this SHA).
3. Upload **contents of `dist/`** to the cPanel document root (**preserve `.htaccess`**).
4. Confirm `tour-inquiry.php` is present and PHP mail works on the server.
5. Smoke: home, one scheduled tour, one private-fixed tour, activity, specialist, return, custom-requests, contact dry path.
6. Do not delete server-only files James keeps outside git without confirmation.
7. Rollback: redeploy from backup tag / prior known-good dist archive.

**Agents must not deploy** to afghantours.com / cPanel.

## Explicit confirmation

- No upload to cPanel, DNS change, live customer inquiry, redesign, or enhancement work beyond the P1 404 fix above.
- No further improvement PRs opened.
