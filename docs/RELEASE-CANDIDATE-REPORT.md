# AfghanTours cPanel — Release Candidate Report

**Date:** 2026-09-25 (Asia/Kabul)  
**Repo:** `james-sidiqi/afghantours-cpanel-final-2026-09-05`  
**Candidate `main` tip:** `e87c107` (`e87c1078116fe6513e565db23f8608d70afb0e7a`)  
**Production deploy:** **NOT performed** — awaiting James deployment review

## Verdict
**RELEASE CANDIDATE READY** for James cPanel deployment review — **only after** this document’s `main` tip has **all CI green** (including Dist drift).

> **Correction:** Earlier Phase-15 RC docs (through tip `57bb2d4`) were **premature**. GitHub Actions on that tip was **RED** solely because Dist drift failed (`Math.random()` attraction-popup scope IDs). Content/QA steps were already green. Fixed on branch `fix/ci-dist-drift` (deterministic scope IDs + regenerated tracked `dist/`).

Engineering P0 = **0** · P1 = **0**

## Build metrics
| Metric | Value |
|--------|-------|
| Astro pages | **307** |
| Sitemap URLs | **300** (15 redirect/noindex stubs excluded) |
| Integrity `--strict` | ERROR=0 WARN=0 (INFO hub-normalization notes only) |
| Slug audit | 324 checked, 0 duplicates |
| Image audit missing | **0** |
| Tour image identity | 13 active, 0 failures |
| Inquiry entrypoints | **10/10 PASS** |
| PHP lint | clean |
| Sales funnel | pass criteria met |
| Dist drift | **must be green on final `main`** (fixed: deterministic popup/map IDs) |

## Dist drift root cause (gate fix)
1. **Nondeterministic IDs:** `Math.random()` in `AttractionPopupGrid.astro` (`data-attraction-scope="attraction-popup-…"`) rewrote 137 tracked HTML files (attractions / destinations / hubs / regions) on every build. Also hardened `TourRouteMap.astro`.
2. **Environment-dependent paths:** `FeaturedTours.astro` serialized full tour rows (nested markdown with absolute `file` paths from `readMarkdownFolder`) into `define:vars`, so `dist/index.html` + `dist/tours/index.html` differed between local `/workspace/...` and GitHub Actions runner paths.
- **Fix:** pathname-derived stable IDs; repo-relative markdown `file` paths; lean FeaturedTours client DTO; regenerate `dist/` via `npm run build` only. Drift check left enabled (failure now also runs `scripts/ci-dist-drift-diagnose.mjs`).

## Merged PRs this drive
| PR | Merge SHA | Title |
|----|-----------|-------|
| #3 | `280e6ca` | Integration: taxonomy, hubs, inquiry (tip `ecb10ff`) |
| #4 | `5401076` | Asset integrity (missing → 0) |
| #5 | `51aee8f` | CI, README, archive, AGENT-RULES |
| #6 | `65c2f18` | Canonical catalog matrix |
| #7 | `3ba8410` | Tour image identity lock |
| #8 | `06237d4` | SEO sitemap stubs + content verification |
| #9 | `96b2943` | Release candidate docs (later corrected — CI was still red) |
| #10 | `e87c107` | Dist drift: deterministic IDs + lean FeaturedTours payload |

## Brand locks confirmed
- Header: Afghan Tours  
- Footer: James Tourist & Travel Agency  
- Safety: “Your safety is planned, not promised.”  
- Leadership: James + Edrees only  

## P0 / P1 / P2
| Level | Count | Notes |
|-------|------:|-------|
| P0 | 0 | None blocking ship |
| P1 | 0 | None blocking ship |
| P2 | several | Non-blocking: FAQ SoT consolidation; empty `tours_custom.csv` keep/delete; optional typed hotel room gallery folders; remaining restaurant story pages in sitemap; itinerary hub-normalization INFO notes |

## James backlog (non-blocking)
See `docs/NEEDS-JAMES-DECISIONS.md`, `docs/NEEDS-JAMES-IMAGES.md` (0 active missing), `docs/NEEDS-VERIFICATION.md`.

## Deploy notes
Follow `docs/DEPLOYMENT-CPANEL.md`. Keep tag `cpanel-backup-2026-09-24`. Upload `dist/` only after James review. Confirm PHP mail on server.

## Explicit non-actions
- Copiloted repo not overwritten  
- afghantours.com / cPanel **not deployed** by this drive  
- Catalog active states / FAQ business decisions **not** changed in the dist-drift gate fix  
