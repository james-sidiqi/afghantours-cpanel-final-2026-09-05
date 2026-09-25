# cPanel deployment (James only)

**Agents must not deploy** to afghantours.com / cPanel as part of the release drive.

## Preconditions
1. Release candidate docs complete (`docs/RELEASE-CANDIDATE-REPORT.md` when Phase 15 done)
2. `main` QA gate green
3. Backup tag retained (e.g. `cpanel-backup-2026-09-24`)
4. James review of P0/P1 and NEEDS-* docs

## Upload (human)
1. Build on a clean `main`: `npm ci && npm run build`
2. Upload **contents of `dist/`** to the cPanel document root (preserve `.htaccess`)
3. Confirm `tour-inquiry.php` is present and PHP mail works
4. Smoke: home, one scheduled tour, one private-fixed tour, activity, specialist, return, custom-requests, contact dry path
5. Do not delete server-only files James keeps outside git without confirmation

## Rollback
Redeploy files from the backup tag / prior known-good dist archive.
