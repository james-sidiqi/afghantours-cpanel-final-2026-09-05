# CURRENT STATE: read this first (verified 16 Oct 2026)

This file is the authoritative current-state record. It supersedes any conflicting statement in the 2026-10-15 docs. GitHub values were re-checked with `gh` on 16 Oct 2026, 16:30 Kabul time (UTC+4:30). The cPanel and live values come from James's cPanel screenshots, taken the same day.

## GitHub (james-sidiqi/afghantours-cpanel-final-2026-09-05)
- **main HEAD:** `4e4d9f0edbfe458cd7de9da7dcb3a63944698f37` (PR #33 merge)

| PR | Branch → base | Head SHA | State | Draft | Mergeable | CI |
|---|---|---|---|---|---|---|
| #36 | image-swaps-safety-pricing-silkroad → main | `bf8e6f8504d3a05d0dad7a2d2fe9e104a3957aba` | open | no | yes | green |
| #37 | remove-eid-and-gallery-images → main | `e1aecaebfda5412c1673762cf0da8ea9e8e46d5a` | open | no | yes | green |
| #38 | t271-attractions-nuristan → remove-eid-and-gallery-images (stacked on #37) | `50b9fa76234c8102ff7151d81f7a608d774117f6`, plus the docs commits added after it | open | yes | yes | green |
| #39 | chore/cpanel-staging-deploy → main | `b98407d124ed5410b4a7498f54b435de62e4d467` | open | yes | yes | green |

- Every PR head has green CI. What is **not** verified yet is the combined main after merging #36, then #37, then #38.
- No PR has been reviewed. #17 (HesabPay) is out of scope, so leave it alone.

## Three different states. Never assume they match.
1. **GitHub main:** `4e4d9f0e`.
2. **cPanel Git checkout:** `/home/jamesbon/repositories/afghantours-cpanel-final-2026-09-05/`, branch `main` at `8ee095176056edcbf1a140b1868525be275452d9` (10 Oct). It is **older** than GitHub main. Its dist is also different: dist/.htaccess 3.2 KB, dist/index.html 95.67 KB, dist/tour-inquiry.php 28.6 KB. cPanel Git deployment is disabled because main has no `.cpanel.yml`. **Never deploy from this checkout.**
3. **Live production:** `/home/jamesbon/afghantours.com/`. It is newer than the cPanel checkout and **not** proven identical to GitHub main. Files seen there: .htaccess 4.04 KB (12 Oct, 0644), index.html 99.54 KB (14 Oct), robots.txt 108 B, sitemap.xml 22.96 KB, tour-inquiry.php 30.41 KB (13 Oct). Directories seen: booking/, manage/, photo-credits/, .well-known/. The booking .htaccess files look normal: booking/ 377 B, booking/lib 192 B, booking/seed 191 B. There is no stray copy of the root file.

> Correction: an earlier report said "current checkout copilot/t271-attractions-nuristan at 4e4d9f0e". That was a temporary agent workspace. It is **not** the cPanel checkout.

## PR #39 is staging only
- It adds `.cpanel.yml`, which deploys **only** to `/home/jamesbon/afghantours-deploy-staging/`, by copying all of dist/.
- It must stay a draft. Do **not** point it at `/home/jamesbon/afghantours.com/`.
- The production package (DEPLOYMENT-RUNBOOK.md) deliberately excludes .htaccess, PHP, booking/ and manage/.

## Blockers to production (all are still open)
1. No fresh Home Directory backup covering afghantours.com/ and afghantours-private/.
2. The live .htaccess hasn't been saved separately or compared line by line. Its size and permissions prove nothing about its contents. James hit a File Manager re-authentication loop when he opened it.
3. No rollback point has been recorded.
4. The mailbox and inquiry test access for the end-to-end inquiry test isn't available yet.
5. #36, #37 and #38 aren't merged, and nothing from this release is live.
6. James hasn't explicitly authorized merging or deploying.

## Exact next actions, in order. Each one needs James's go-ahead.
1. James downloads a Home Directory backup and saves the live .htaccess separately. Record the backup's filename, size and time (Kabul).
2. Verify the backup and record the rollback point (DEPLOYMENT-RUNBOOK.md §1).
3. With James's approval, merge #36, then #37, then #38. #38 must be retargeted to main first. If a merge conflicts, rebuild dist; never hand-edit it.
4. Rebuild the final main, confirm dist has no drift, and run the full QA (RELEASE-STATUS.md §4).
5. Prepare the final deployment artifact and reconcile it with release-deploy.zip (sha256 `fe3fd8a5…14fe62a`). Don't assume they match.
6. Reconcile .htaccess by hand: keep every live-only rule and apply only the 4 redirect changes (manifests/htaccess-diff.txt).
7. Deploy only after James explicitly authorizes it, then run the smoke tests, the inquiry/mailbox test and the WhatsApp check.

## Merge rehearsal: 16 Oct 2026, ~21:45 Kabul (UTC+4:30). Local only, nothing pushed or merged.
Re-verified with `gh` first: main `4e4d9f0e`; #36 `bf8e6f85`, #37 `e1aecaeb` (open, ready, MERGEABLE, CI pass); #38 `3b469078` (draft, base remove-eid-and-gallery-images, MERGEABLE, CI pass); #39 `b98407d1` (draft, MERGEABLE, CI pass). #17 untouched. `AGENT-RULES.md` exists at repo root.

In a fresh clone on main:
1. `git merge origin/image-swaps-safety-pricing-silkroad` (#36): clean.
2. `git merge origin/remove-eid-and-gallery-images` (#37): **54 conflicts, all under dist/; 0 source conflicts.** Resolved with `npm ci && npm run build`, then `git add -f dist` (dist/ is in .gitignore but tracked, so `-f` is required).
3. `git merge origin/t271-attractions-nuristan` (#38): **31 conflicts, all under dist/; 0 source conflicts.** Resolved the same way.
4. Second `npm run build`: `dist/` has **no drift**. Rehearsal result commit (local only): `b4a287dc`. Pushing it as a branch was blocked pending approval, so it was not pushed; the next agent can reproduce it in a few minutes with the steps above.

Every CI step ran locally on the rehearsal result and passed: booking data validation (0 errors, 13 legacy warnings), core.test, PHP lint (tour-inquiry, booking, manage, hash-password), parity, PHP core tests 733/0, integration 157/0, cancellation-policy test, internal links (24,175 checked, 0 broken), site integrity --strict, slug audit (no duplicates), image audit (missing 0), sales funnel audit, inquiry entrypoint audit, tour image identity, and the dist drift check.

**Comparison with release-deploy.zip (sha256 `fe3fd8a5…14fe62a`):** all 344 files in the zip are byte-identical to the rehearsal dist. Rehearsal dist vs main: 271 modified, 65 added, 9 renamed, 4 deleted. The only changed file *not* in the zip is `dist/.htaccess`, which is excluded on purpose (it is reconciled by hand: 4 redirects only). So the zip is still valid for the final main, *if* main ends up identical to the rehearsal.

Note: when #37 and #38 are actually merged on GitHub, each PR branch has to be updated from main and its dist rebuilt the same way. See GITHUB-CPANEL-PUBLISHING-WORKFLOW.md for the deployment model and for which paths are protected.

**Publishing model:** see [GITHUB-CPANEL-PUBLISHING-WORKFLOW.md](GITHUB-CPANEL-PUBLISHING-WORKFLOW.md).
