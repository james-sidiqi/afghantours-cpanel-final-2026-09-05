# Trip planner M1 — inventory, boundaries, and staging integration

Status: M1 only. Nothing in this change is deployed. M2, M3, and M4 are not started beyond the minimum shell this gate needs: a staff sign-in, a public request form, and an isolated intake adapter.

Source branch for the work: `images/mbp-consolidation-20261102` at `d563270b`. This implementation branch is `cursor/trip-planner-m1-5860`. The draft pull request targets `main`. Do not merge it.

Reviewed and not merged: `feature/trip-planner-m1-contracts-20261107`. Two pieces were brought across after review. The staff proposal schema (`contracts/trip-planner/staff-proposal.v1.schema.json`) is that branch's private contract, unchanged in content and still free of rate values. The public leak scan uses that branch's archive-name markers and `low_afn` field pattern. Its standalone checker was not copied: it treats any `private-calculator/` directory in `public/` or `dist/` as a failure, and this milestone has to ship the staff sign-in there the same way `booking/` and `manage/` already live in `public/`. The release packager still excludes those paths from the static ZIP.

## What is in the repository

- Public request contract: `contracts/trip-planner/public-submission.schema.json` (schema version 1). The PHP adapter enforces it. Supplier cost, margin, and staff-rate fields are rejected.
- Private proposal contract, for M2, with no rate values: `contracts/trip-planner/staff-proposal.v1.schema.json`.
- Source inventory, hashes and row counts only: `contracts/trip-planner/source-inventory.json`.
- Staff sign-in: `public/private-calculator/index.php` plus a scoped `.htaccess`.
- Public staging form: `src/pages/trip-planner/index.astro`, built to `dist/trip-planner/index.html`, `noindex`, not in the sitemap.
- Intake adapter: `public/trip-request/index.php` plus a scoped `.htaccess`. It does not call `/booking/`, `/manage/`, or `tour-inquiry.php`.
- Shared PHP library, denied as a URL: `public/trip-planner-lib/`.
- Config template with placeholders only: `deploy/trip-planner/config.example.php`.
- Password helper, stdin only: `scripts/trip-planner/hash-password.php`.
- Gate test: `scripts/trip-planner/test_m1.py`, run from `scripts/release/qa.sh` after the build.

The private archive, workbooks, and a real `config.php` are not in git. Operator assumptions stay in the external policy file. They are not copied into this repository or into the public page.

## Source inventory

Verified against the owner handoff archive locally. The archive itself is not committed. Re-check on a machine that has it with `AFGHANTOURS_PRIVATE_ARCHIVE` pointed at `PRIVATE_ARCHIVE_DO_NOT_WEB_UPLOAD`.

| Register | Rows |
| --- | ---: |
| Historical AFN cost bands | 125 |
| Those rows with every band empty | 33 |
| User-supplied AFN register | 125 |
| Those rows with every band empty | 28 |
| Master rate register | 73 |
| Historical hotel ranges | 14 |
| Attraction fee references | 65 |
| Vehicle capacity rules | 6 |
| Published tour comparisons | 15 |
| Room cost/sell comparisons | 43 |
| Rate-review issues | 11 |
| Source workbook files | 8 |
| Archive files hashed | 21 |

Empty bands are unknown, not zero. Hashes are in `contracts/trip-planner/source-inventory.json`. No quote was produced. Costing and PDF preview are M2.

## Routes

`dist/sitemap.xml` stays at the 298 URLs recorded in `scripts/trip-planner/expected-sitemap-urls.txt`. The new page is `noindex`, so the sitemap generator skips it. Existing pages are not edited. The root `public/.htaccess` is not edited.

## Runtime paths

Verify the real cPanel document root before copying. The proposed staging root is `/home/jamesbon/staging.afghantours.com`.

Under that document root, from `public/` (PHP and `.htaccess`) and from `dist/` (the generated page only):

- `private-calculator/.htaccess`
- `private-calculator/index.php`
- `trip-request/.htaccess`
- `trip-request/index.php`
- `trip-planner-lib/.htaccess`
- `trip-planner-lib/bootstrap.php`
- `trip-planner-lib/contract.php`
- `trip-planner-lib/intake.php`
- `trip-planner-lib/inventory.php`
- `trip-planner-lib/staff.php`
- `trip-planner/index.html`

Outside every document root:

- `/home/jamesbon/private/afghantours-trip-planner/config.php` (from the example; generate the hash on the server)
- `/home/jamesbon/private/afghantours-trip-planner/source-inventory.json` (the committed inventory file)
- `/home/jamesbon/private/afghantours-trip-planner/PRIVATE_ARCHIVE_DO_NOT_WEB_UPLOAD/` (the owner archive, unchanged)
- `intake/`, `sessions/`, and `ratelimit/` under that same private directory (the app creates them)

The app refuses a config file or data root that resolves inside `DOCUMENT_ROOT`, `public_html`, or `staging.afghantours.com`. The archive directory name is read from the private inventory file, not from the public PHP.

Static release ZIPs do not include these paths. `scripts/release/package.py` allowlist excludes them. A later staging ZIP extract does not delete files it does not contain, so a separate copy of this list can survive a static release. Do not copy the folder onto production.

## PHP and server checks still required on cPanel

- PHP 8.1 or newer for the vhost, with `password_hash`, sessions, and `json` available.
- Staging Directory Privacy stays on. These child `.htaccess` files do not use `Require all granted`. They add `Require valid-user` with `AuthMerging And` on `index.php` only, and deny every other file.
- `php_flag engine on` overrides a parent `php_flag engine off` when `.htaccess` is allowed to. It does not override `php_admin_flag`. If a parent `Require all denied` on `*.php` still blocks these two scripts, stop. Do not edit the root `.htaccess` in this change, and do not grant anonymous access to turn PHP on.
- After any exception, an unauthenticated request must still get the staging password challenge, and the response must be executed PHP rather than source (`<?php` must not be in the body).
- The PHP user must be able to write the private directory. `open_basedir`, if set, must include it.
- HTTPS in front of the vhost so the staff cookie can be marked Secure.

## Access-control checks in this repo

`scripts/trip-planner/test_m1.py` covers:

- logged-out staff URL is a login form and does not echo a fixture cell
- wrong password rejected; missing CSRF rejected; eight failures then throttling
- good password reaches hash/row checks and still does not echo the fixture cell
- logout returns to the login form
- direct requests for the library return 404
- config or data root inside the document root is rejected
- intake stores one lead outside the docroot and says the request was received, with availability and prices still to be confirmed
- a private rate field is rejected and not echoed
- a filled honeypot is not stored
- public and `dist/` text files do not contain the private archive markers
- no tracked file has the SHA-256 of an archive file
- sitemap URL set is unchanged
- the static packager excludes the new paths

This does not prove the live staging password gate. That check has to be done on the server.

## M1 gate still open

- No staging or source backup was created. The specification asks for one. The owner's standing instruction is no backups. That conflict stays open. Do not treat rollback as ready.
- The live document root, inherited PHP deny, PHP version, and Directory Privacy were not inspected from this environment.
- No real staff password is in git. The private archive is not on the server as part of this change.
- Intake stores the request for the signed-in staff list. It does not send mail.
- There is no indicative public price and no client PDF.
- Nothing has been deployed, and this pull request must not be merged on the strength of M1 alone.

## M2

M2 is the private workspace after this gate: lead editing, day-by-day itinerary changes, supplier costing that keeps each source distinct, photo selection from the existing library, and a client PDF preview that omits supplier costs and margins. The public wizard with an approved indicative price is M3. Device and owner acceptance is M4.
