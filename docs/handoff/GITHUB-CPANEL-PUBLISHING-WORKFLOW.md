# GitHub → cPanel publishing workflow (plain English, 16 Oct 2026)

**Status: this is the target design. Production publishing is not set up yet.** PR #39 (draft) only deploys to staging.

## 1. Where edits happen
Every website change happens in GitHub (`james-sidiqi/afghantours-cpanel-final-2026-09-05`): source in `src/`, `public/`, `data/`, and `content/`. Never edit files in cPanel File Manager, except for the protected server files listed in §6.

## 2. Branches and PRs
- Each change gets its own branch off `main`, for example `fix/typo-bamyan` or `tour/new-wakhan-dates`.
- Commit the source change, then run `npm ci && npm run build` and commit the regenerated `dist/` (use `git add -f dist`). Never hand-edit `dist/`.
- Open a PR. CI must be green and James must approve it.

## 3. How main updates
Merge the PR into main (James approves). If dist/ conflicts, update the branch from main, rebuild, and commit. Never resolve dist/ conflicts by hand.

## 4. How cPanel updates from GitHub
cPanel › **Git™ Version Control** › repository `afghantours-cpanel-final-2026-09-05` › **Manage** › **Pull or Deploy** tab:
1. **Update from Remote** pulls GitHub main into `/home/jamesbon/repositories/afghantours-cpanel-final-2026-09-05/`.
2. Check that "HEAD Commit" shows the same SHA as GitHub main.
3. **Deploy HEAD Commit** runs `.cpanel.yml`. Today that is staging only, and only once #39 is merged.

**UNVERIFIED (James or the next agent must check):** the remote URL is `https://github.com/james-sidiqi/afghantours-cpanel-final-2026-09-05`; the checkout has no uncommitted changes (cPanel greys out Update from Remote if it does); Update from Remote works (if the repo is private, an access token or deploy key may be needed). The checkout is currently stale at `8ee09517`.

## 5. Deployment
- **Today (PR #39):** `.cpanel.yml` runs `mkdir -p` and `cp -R dist/. /home/jamesbon/afghantours-deploy-staging/`. It copies **everything** in dist/, including `.htaccess`, `tour-inquiry.php`, `booking/` (PHP plus seed JSON), and `manage/`. That is safe only because the target is a staging folder. **Never point it at `/home/jamesbon/afghantours.com/`.**
- **Future production design (proposal only; do not implement without James's approval):** a separate deploy task that copies only class A paths, for example with `rsync -a` plus an explicit exclude list, **without `--delete`**:
  ```
  rsync -a --exclude='.htaccess' --exclude='.well-known/' --exclude='booking/' \
    --exclude='manage/' --exclude='*.php' --exclude='photo-credits/' \
    dist/ /home/jamesbon/afghantours.com/
  ```
  Check first that `rsync` exists on the host. If it doesn't, list explicit `cp` commands. Remove obsolete files (the 4 deleted plus 9 renamed-away) by hand only, after the backup.

## 6. Path classes
- **A: Git-managed static (auto-deploy OK):** `index.html`, page folders (`about/ tours/ destinations/ attractions/ …`), `_astro/`, `assets/`, `favicon*`, `data/maps/`, `robots.txt`, `sitemap.xml`.
- **B: server-managed, preserve live (hand-merge only):** root `.htaccess` (live 4.04 KB ≠ dist 3.2 KB; merge only the 4 redirects: Spoghmai, Eid & Celebrations, Barg-e Matal → Nuristan National Park, Bashgal Valley → Nuristan River Valleys & Villages), `.well-known/`, `photo-credits/` (on live, not in dist), every other `.htaccess` (booking, booking/lib, booking/seed, manage), and `tour-inquiry.php` (live 30.41 KB ≠ repo; compare first).
- **C: sensitive runtime (never deploy over):** `booking/` (PHP plus live seed/departure data), `manage/` (admin, password config), `/home/jamesbon/afghantours-private/` (private config, inquiry records), and any data or records the server writes.

## 7. Rollback
Before every production deploy: download a Home Directory backup (it must cover `afghantours.com/` and `afghantours-private/`), save the live `.htaccess`, and record the backup filename, size, time, and the deployed main SHA. To roll back, restore the files from that backup. A code-only rollback is a GitHub revert PR → merge → Update from Remote → Deploy.

## 8. What Copilot does for future edits
Branch → change source → `npm ci && npm run build` → commit source plus dist → open a PR → wait for green CI → ask James to merge. Never touch production, `.cpanel.yml` targets, booking/, manage/, or PR #17 without James's explicit say-so.

## 9. What James clicks to publish
GitHub: **Merge pull request**. cPanel: Git Version Control › Manage › Pull or Deploy › **Update from Remote** › **Deploy HEAD Commit**. Then open afghantours.com and check the changed page.

## Production gates (all must be true before the first production deploy)
1. Fresh Home Directory backup covering afghantours.com and afghantours-private.
2. Rollback point recorded.
3. Live .htaccess saved, with only the 4 redirects merged in.
4. Final main green.
5. Staging deploy verified (compared against live).
6. Mailbox and inquiry test access available.
7. James explicitly authorizes the deploy.
