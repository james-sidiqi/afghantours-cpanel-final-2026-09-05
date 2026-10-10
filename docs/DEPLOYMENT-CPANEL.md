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
6. The upload **must include `dist/.htaccess`** (redirects + payments deny rules). As of 2026-10-10 the live docroot `/home/jamesbon/afghantours.com` has no top-level `.htaccess`.

## Online payments (HesabPay)
- Payment config and records live **outside the web root** in `/home/jamesbon/afghantours-private/` (`hesabpay-config.php`, `payments-data/`). They are **not in git, not in `dist/`, and not in the release ZIP** — create them on the server by hand from `config/hesabpay-config.example.php`.
- With no config, payments are **disabled** (safe default). Redeploying `dist/` never touches the private folder.
- Full setup: `docs/PAYMENTS-HESABPAY.md`.

## Rollback
Redeploy files from the backup tag / prior known-good dist archive.
