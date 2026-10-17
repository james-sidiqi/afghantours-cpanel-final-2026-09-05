# AfghanTours operating guide: GitHub → staging → production

GitHub is the single source of truth. The cPanel Git "Deploy HEAD Commit" button is not used.
Production is changed only by James (or someone he names) after explicit approval.
Times are Kabul (UTC+4:30).

## 1. Requesting a change
James describes the change (text, images, tours, fixes) in chat or a GitHub issue. Final photos are supplied as files; nothing is edited directly in cPanel.

## 2. How the agent creates and tests changes
- Branch from `main` (e.g. `fix/bamyan-typo`), edit source in `src/`, `public/`, `data/`.
- `npm ci && npm run build`, then commit source **and** the rebuilt `dist/` (`git add -f dist`). Never hand-edit `dist/`.
- Run the local checks (links, images, site integrity). CI repeats them on the PR.

## 3. Pull request review
- The agent opens a PR describing what changed and how it was checked. CI (`qa`) must be green.
- James reviews (or asks for screenshots) and merges. Agents never merge without James's explicit go-ahead.

## 4. Building a release
- GitHub → Actions → **Release** → Run workflow (on `main`). It refuses commits that are not on main or lack green CI, rebuilds, checks for `dist/` drift, validates links and images, and publishes a **pre-release** named `at-YYYYMMDD-<8-char sha>`.
- Assets: `<id>.zip` (full static site), `<id>.zip.sha256`, `<id>.manifest.sha256` (per-file hashes), `<id>.version.json`, `<id>.qa.tar.gz`.
- The zip **never** contains `.htaccess`, `*.php`, `booking/`, `manage/`, `photo-credits/`, `.well-known/` or private data. The packager fails if any slip in.
- Local equivalent: `npm ci && npm run build && bash scripts/release/build-release.sh release-out`.
- Routine updates can use a smaller update package: `scripts/release/make-delta.sh <deployed manifest> <new manifest> release-out/stage update.zip` (changed files only, plus a list of stale files for manual review).

## 5. Updating staging
- Staging: `https://staging.afghantours.com`, docroot `/home/jamesbon/staging.afghantours.com/`, password-protected (Directory Privacy), `noindex`, static only (PHP denied; booking/manage/inquiry do not run there and share no data with production).
- cPanel File Manager → staging docroot → Upload `<id>.zip` → check its sha256 matches the release → Extract (overwrite) → delete the uploaded zip.
- The staging `.htaccess` and `robots.txt` come from `staging-overlay.zip`, applied once (and re-applied if overwritten). Apply the overlay **before** enabling Directory Privacy, or merge by hand afterwards, because Directory Privacy writes its own lines into `.htaccess`.
- Check `https://staging.afghantours.com/version.json` shows the new release, then review the changed pages.

## 6. Approving production
James approves in writing, naming the release ID (e.g. "Deploy at-20261018-abcd1234 to production"). Then:
1. Backup: compress the files about to be replaced (from the update package's changed list) or take a Home Directory backup. Save the live `.htaccess`. Record the backup name in the ledger.
2. Upload the **same zip** that passed staging to `/home/jamesbon/afghantours.com/`, confirm the sha256, extract with overwrite. Never delete during deploy.
3. Do not touch `.htaccess`, `booking/`, `manage/`, `tour-inquiry.php`, `.well-known/`, `photo-credits/` or `/home/jamesbon/afghantours-private/`. Changes to those are separate, reviewed manual steps.
4. Stale files (listed by the update package) move to cPanel Trash by hand only after verification passes.

## 7. Verifying the live commit and release
- `https://afghantours.com/version.json` (add `?cb=<anything>` to skip caches) shows `release`, full `commit` SHA and `built_at`.
- `bash scripts/release/check-deployed.sh` compares production and staging `version.json` with GitHub `main` and reports how many commits are not yet deployed.
- Smoke test: home page, changed pages (desktop + mobile), a test inquiry, `/manage/` and `/booking/` behave as before.
- Add a row to `docs/deployments/LEDGER.md` (date, environment, release, commit, backup, verification, rollback target) via a small PR.

## 8. Restoring the previous release
- **Fast:** download the previous release zip from GitHub Releases and extract it over the docroot (overwrite); `version.json` returns to the previous release. Re-run §7.
- **Exact:** extract the pre-deploy backup taken in §6.1 and restore any trashed stale files from cPanel Trash.
- **Disaster:** restore the Home Directory backup.
- **Source:** revert the PR on GitHub → new release → normal flow. Record the rollback in the ledger.
