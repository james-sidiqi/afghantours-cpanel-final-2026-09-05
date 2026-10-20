# Deployment and rollback runbook: release #36 → #37 → #38

> Historical release instructions. PRs #36–#39 are now merged. Use [the current release runbook](../RELEASE-RUNBOOK.md) for protected staging and verified ZIP promotion; do not deploy an old bundle using this checklist.

This is the only deployment procedure. It replaces docs/DEPLOYMENT-CPANEL.md and the box-only DEPLOY-RUNBOOK.md.
**Agents do not deploy.** James performs or explicitly authorizes each step.

> **STOP RULE:** if any prerequisite in §0 is missing, or any check fails, STOP and report to James. Do not improvise, skip a step, bypass cPanel bot protection, scrape sessions or retry access in loops.

## 0. Prerequisites (all mandatory)
- [ ] James's explicit written go-ahead for the merge, and separately for the deploy
- [ ] cPanel access by James or a person he names (account jamesbon), through the normal login
- [ ] A fresh production backup, downloaded and verified (§1)
- [ ] A copy of the live docroot .htaccess (§1)
- [ ] A rollback point recorded (§1)
- [ ] Merged main with green CI qa, and a reconciled zip (§3–4)
- [ ] Mailbox access to confirm a test inquiry (§7)

## 1. Backup and verify (currently BLOCKED)
1. cPanel → Backup → download a full Home Directory backup (or a host snapshot). Record the filename, size and time (Kabul).
2. Verify it: the archive opens (`tar -tzf backup.tar.gz | head`), it contains afghantours.com/ and afghantours-private/, and its size is plausible.
3. Download /home/jamesbon/afghantours.com/.htaccess on its own and save it as htaccess-live-YYYYMMDD.txt.
4. Rollback point = this backup + the saved .htaccess. Record the backup's filename, size and time. The backup itself is the rollback point. Live is NOT proven identical to git 4e4d9f0e, so you can't roll back by redeploying that SHA.

## 2. Merge the PRs (GitHub; needs James's approval)
1. Re-check: `gh pr view 36 37 38 --json state,headRefOid,mergeStateStatus,statusCheckRollup`.
2. Merge **#36** (image-swaps-safety-pricing-silkroad → main).
3. Update **#37** with main: `git checkout remove-eid-and-gallery-images && git merge origin/main`. The conflicts are **dist/ only**: `git checkout --theirs dist/ 2>/dev/null; npm ci && npm run build && git add -A dist && git commit`. Check that `git diff --name-only --diff-filter=U` lists no src/ files. Push, wait for qa to go green, then merge #37.
4. **#38:** `gh pr edit 38 --base main`, then merge origin/main into t271-attractions-nuristan and resolve dist/ the same way (rebuild). Push, wait for green qa, `gh pr ready 38`, then merge.
5. Never force-push, and never hand-edit dist/.

## 3. Rebuild from merged main
```
git checkout main && git pull --ff-only
npm ci && npm run build
git status --short dist   # must be empty (no drift)
```
Run the local checks listed in RELEASE-STATUS.md §4.

## 4. Build and reconcile the zip (never assume the old zip matches)
```
git diff -M --name-status 4e4d9f0e HEAD -- dist > changes.txt
grep -v '^D' changes.txt | awk '{print $NF}' | sed 's#^dist/##' | grep -vx '.htaccess' > ship.txt
(cd dist && zip -X ../release-deploy-final.zip -@ < ../ship.txt)
awk '$1=="D"||$1~/^R/{print $2}' changes.txt | sed 's#^dist/##' > stale-final.txt
```
- Compare ship.txt with the paths in manifests/release-deploy-zip-manifest.sha256, and stale-final.txt with manifests/stale-to-trash.txt. Any difference must be explained by changes after 21a1ee06, or STOP.
- If the content is unchanged, the per-file sha256 should match the manifest. The zip's own hash can differ from the earlier `fe3fd8a5…` package.
- Confirm that no booking/, manage/, *.php, .htaccess or private files are in the zip.

## 5. Merge the .htaccess by hand
Compare htaccess-live-YYYYMMDD.txt with manifests/htaccess-main-4e4d9f0e.txt. Keep **every** live-only rule (PHP handler, cache, security). Add or replace only the 4 changes in manifests/htaccess-diff.txt, inside the rewrite block before any catch-all:
- Spoghmai: replace the old `spoghmai-restaurant-qargha → /restaurants/spoghmai-restaurant/` rule with `^restaurants/spoghmai-restaurant(-qargha)?/?$ → /cultural-experiences/culinary/spoghmai-restaurant-qargha/`
- `^cultural-experiences/eid-and-celebrations/?$ → /cultural-experiences/`
- `^attractions/barg-e-matal-lakes/?$ → /attractions/nuristan-national-park/`
- `^attractions/bashgal-valley/?$ → /attractions/nuristan-river-valleys-villages/`
All are `[R=301,L]`. If the live file is identical to htaccess-main-4e4d9f0e.txt, manifests/htaccess-repo-version.txt can be used as-is (it should equal public/.htaccess on merged main).

## 6. Upload (cPanel File Manager)
1. Upload release-deploy-final.zip to /home/jamesbon/afghantours.com/ and extract it there, overwriting files.
2. Upload the merged .htaccess.
3. Do not touch /booking/, /manage/, tour-inquiry.php config, or /home/jamesbon/afghantours-private/.
4. Remove the uploaded zip from the docroot.
5. Move each path in stale-final.txt (13 expected) to the **cPanel Trash**, not permanent deletion, until §7 passes. The expected paths are 6 old _astro CSS bundles, the Barg-e Matal page and its 2 images, the Bashgal page and its 2 images, and the Eid & Celebrations page.

## 7. Live smoke tests (hard refresh)
- 301 then 200 in one hop: /attractions/bashgal-valley/, /attractions/barg-e-matal-lakes/, /cultural-experiences/eid-and-celebrations/, /restaurants/spoghmai-restaurant/, /restaurants/spoghmai-restaurant-qargha/ (`curl -sI`)
- /photo-credits/ returns 302 → /
- 200: /, /attractions/nuristan-river-valleys-villages/, /attractions/nuristan-national-park/, /food-culture/dried-fruits/paktia-pine-nuts/, /hubs/bamyan-city/, /destinations/, /hubs/, /sitemap.xml (300 URLs)
- Visual: cards, attraction popups (images visible), region and hub names, Pine Nuts hero framing, no "Afghanistan, Reimagined."
- **WhatsApp:** links open https://wa.me/93780123456
- **Inquiry:** submit one clearly labelled test inquiry through the site form. Confirm it arrives in the business mailbox (subject, reference number, no PHP errors). Record the reference.
- /manage/ and /booking/ behave as before.
- Any failure → §8.

## 8. Rollback
1. Restore the files from the §1 backup, or re-extract the previous package over the docroot.
2. Restore htaccess-live-YYYYMMDD.txt.
3. Restore the trashed files from the cPanel Trash.
4. If the source must roll back too: `git revert -m 1 <merge #38>`, then #37, then #36, through a PR (needs James).


## State verified 16 Oct 2026
The authoritative current state is in [CURRENT-STATE-2026-10-16.md](CURRENT-STATE-2026-10-16.md), which covers the SHAs, PR states and CI, GitHub main vs the cPanel checkout vs live, PR #39 being staging only, the blockers and the next actions. Where this file conflicts with it, CURRENT-STATE wins. Summary: #36 and #37 are open, ready, mergeable and green. #38 is an open draft, mergeable and green, stacked on #37. #39 is an open draft, staging only and green. GitHub main is `4e4d9f0e`. The cPanel Git checkout is main at `8ee09517` (older, never deploy from it). Live production is newer than that checkout and not proven equal to GitHub main.

Rules added on 16 Oct:
- **Never deploy from the cPanel Git checkout** (/home/jamesbon/repositories/afghantours-cpanel-final-2026-09-05/, main at 8ee09517). It is older than both live and GitHub main. cPanel Git deploy stays disabled.
- **PR #39** (`.cpanel.yml`) targets only /home/jamesbon/afghantours-deploy-staging/ and copies all of dist/. Use it for staging tests only. Never repoint it at /home/jamesbon/afghantours.com/. The production package in §3–4 excludes .htaccess, PHP, booking/ and manage/.
- **Order:** backup and rollback point (§1), merge #36, then #37, then #38 (§2), rebuild the final main and confirm there's no dist drift, run the full QA, build the final artifact and reconcile it with release-deploy.zip without assuming it matches (§3–4), reconcile .htaccess by hand with only the 4 redirects (§5), then deploy.
- **STOP** unless all of these are in place: a fresh backup, the live .htaccess preserved and reconciled, a recorded rollback point, mailbox and inquiry test access, and James's explicit authorization to deploy.
