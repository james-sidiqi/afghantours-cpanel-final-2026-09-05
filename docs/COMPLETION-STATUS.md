# AfghanTours cPanel — Completion Status

Last updated: 2026-09-25 ~21:40 Asia/Kabul

## Current phase
**Phase 0** — Inquiry entry points complete; QA green; ready to merge PR #3.

## Branch / HEAD
- Working branch: `feat/hub-experience-architecture`
- Build: **307 pages**; sitemap **315 URLs**
- Integrity `--strict`: ERROR=0 WARN=0
- Inquiry entry-point QA: **10/10 PASS** (`docs/INQUIRY-ENTRYPOINT-QA.md`)
- Production deploy: **NOT started**

## Phase checklist
| Phase | Status | Notes |
|-------|--------|-------|
| 0 Inquiry entry points + merge PR #3 | READY TO MERGE | Canonical inquiry helper + contact parser + PHP harden + entrypoint QA |
| 1 Post-merge cleanup | PENDING | |
| 2 fix/asset-integrity | PENDING | ~56 missing image refs (audit-images) |
| 3 chore/repo-hygiene-ci | PENDING | |
| 4–15 | PENDING | |
| 16 Production deploy | STOP — James only | |

## Phase 0 deliverables
- `src/lib/inquiry.ts` — `buildTourInquiryHref` + siblings
- Wired: FeaturedTours, TourDecisionStrip, tours/[slug], TourInquiryModal, activities/specialist/return/custom
- Contact parser: canonical-first
- `public/tour-inquiry.php` hardened
- `docs/DATA-SOURCE-OF-TRUTH-AUDIT.md` — `tours_featured.csv` corrected to USED FOR BUILD / FEATURED-TOUR SELECTION
- FAQ consolidation deferred (not in PR #3)

## Guards
- Do not invent prices/dates/venues/safety/visa facts
- Do not silently change product active/inactive when ambiguous
- Do not overwrite Copiloted repo
- Do not deploy to cPanel / afghantours.com in this drive
- Dist: build-only; never hand-edit
