# AfghanTours cPanel — Release Candidate Report

**Date:** 2026-09-25 (Asia/Kabul)  
**Repo:** `james-sidiqi/afghantours-cpanel-final-2026-09-05`  
**Candidate `main` tip:** `5f540b48e8cc361bd31829379815cdd0dfbcd9a1` (post-#11; H8 Contact CTA on PR #12 — update after merge)  
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
| #11 | `5f540b4` | Customer-facing acceptance: safety line + product-class labels |
| #12 | _(pending)_ | Mobile header: Contact Us CTA fully visible on 320–430px (H8) |

## Brand locks confirmed
- Header: Afghan Tours  
- Footer: James Tourist & Travel Agency  
- Safety: no “Your safety is planned, not promised.” slogan (James rejected)  
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

## Customer-facing acceptance addendum (2026-09-25)
- PR #11 merged: homepage safety line + Scheduled / Private Fixed product-class clarity.
- **H8 fixed on PR #12:** mobile header yellow **Contact Us** CTA was clipped at ~390px. Minimal CSS in `src/layouts/Header.astro` puts CTA on its own full-width row under the brand; nav links remain on the next row; desktop unchanged. WhatsApp `+93 780 123 456` unchanged.
- Screenshot: `/workspace/acceptance-shots/home-mobile-contact-fixed.png`
- **NOT DEPLOYED** — awaiting James cPanel deployment review after #12 merges and main CI is green.
