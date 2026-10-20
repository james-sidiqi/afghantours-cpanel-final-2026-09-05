# Verified cPanel release runbook

Current procedure, 18 October 2026 (Kabul). Supersedes cPanel Git-button / whole-dist upload instructions. A GitHub release is a package, **not a deployment**. Staging on cPanel comes before production. No hosting credentials go into GitHub.

## Ownership and stop conditions

Codex owns the repository repair branch and QA. Grokbot/James own cPanel operations. James reviews the PR and approves the exact release after staging. Do not merge or publish to production without that approval. Do not run overlapping source edits in two agents. Record coordination in issue #42.

Before any extract, confirm the actual document root, backup location and target host. Stop for an unknown path, missing backup, unexpected live-only changes, incomplete checksums, SSL/auth failure, or a red check. Do not substitute GitHub's automatic “Source code” ZIP for the `at-…-full.zip` asset.

James's 17 October instruction: live Balkh/Wakhan/Wardak replacements are temporary and GitHub is source of truth. PR #44 now removes its initial import of #41 and restores those image/source paths to main. Hold #41; keep #40 draft until final approved Balkh images arrive, then rebase/fold the needed source change into a separate final-image PR. Staging may show the approved GitHub content; the first production release waits for final approved images on main, then deliberately overwrites the temporary live copies. Back up those copies; no special reconciliation is needed for these known temporary files. Other unexpected live changes still require review. Payment PR #17 remains outside this release. Prices, operating minimums, departures and live booking inventory are not reset by these changes.

## 1. Establish the real baseline

1. Verify the live root and staging root in cPanel. Proposed staging is `/home/jamesbon/staging.afghantours.com/`, but verify it; never assume `/public_html/` or an old repo deploy path is correct.
2. Back up the complete live webroot, including hidden files, plus private booking/configuration data separately. Store backups **outside every webroot**, record timestamp and checksums, and prove the archives can be opened/restored. Keep secrets and customer data out of GitHub and chat. `afgha.zip` is a claimed baseline, not a verified backup until inspected.
3. Compare live static files against the proposed release, including recent owner image edits. Have Codex incorporate approved live-only static changes before packaging. Do not overwrite unknown changes or copy private/live data into source.
4. Inventory server-owned `.htaccess`, PHP, `booking/`, `manage/`, payment files, `.well-known/`, `photo-credits/`, private configuration, inventory, inquiries and cron. Verify no legacy cPanel deployment is queued. The repository `.cpanel.yml` now fails closed, but this does not cancel an already queued hosting operation.

## 2. Create the release in GitHub

After approved changes merge, wait for the **push CI on that exact main SHA** to pass. In Actions run **Verified cPanel release** from main. Leave `previous_release` empty for the first deployment or an unknown baseline. No deployment secrets are needed.

The workflow checks that its commit is still main, rebuilds with Node 20, runs all site/PHP/mail/browser/packager checks and the tracked-dist drift gate, and publishes `at-YYYYMMDD-SHA8`. The publication job checks main again. If main advanced, rerun against the newly approved green commit.

Release assets:

- `at-…-full.zip`: static files with `version.json`; assets first, pages next, marker last.
- `manifest.json`, `files.sha256`, `SHA256SUMS`: archive and per-file verification.
- `version.json`: release ID, full source SHA and build time (UTC).
- `QA.txt`, `excluded-paths.json`, this runbook.
- Staging sidecars (outside the production ZIP): `robots-staging.txt`, `STAGING-HTACCESS-FRAGMENT.txt`, `STAGING-SETUP.md`. They are included in `SHA256SUMS` and may be installed in staging while preparing hosting. Never upload these sidecars to production.
- When a verified previous release was selected: `at-…-changes.zip`, `changes-manifest.json`, `changes.json`.

The packager uses an explicit static allowlist, not “everything in dist except PHP”. It excludes `.htaccess`, all dotpaths, PHP/executables, booking/manage/payments, booking seed/data, `photo-credits/`, private files, backups, and Astro server build intermediates. Review `excluded-paths.json`. No ZIP deletes files.

On a local machine (no SSH required), verify files downloaded **from the trusted GitHub release**:

```bash
sha256sum -c SHA256SUMS
python3 scripts/release/package.py verify /path/to/at-ID-full.zip /path/to/manifest.json
```

Checksums detect changed bytes; they are not proof of authorship if both archive and manifest came from an untrusted source.

## 3. Stage the exact ZIP on cPanel

1. Create/verify the isolated staging subdomain and its own folder. Verify actual DNS resolution and valid HTTPS certificate/AutoSSL completion; a DNS entry alone does not prove SSL is ready.
2. Enable cPanel Directory Privacy with a staging-only credential. Keep staging secrets out of GitHub/chat. Verify unauthenticated requests for HTML, assets and `version.json` get a challenge, and authenticated requests work.
3. Add staging-only `X-Robots-Tag: noindex, nofollow` and a deny-all robots policy using the release's `STAGING-SETUP.md` sidecar. Upload the reserved `robots-staging.txt` into staging and merge `STAGING-HTACCESS-FRAGMENT.txt` into its existing `.htaccess`, preserving Directory Privacy and existing deny rules. Place its robots rewrite before any catch-all rule. The fragment applies only to the exact staging host; it is not a complete `.htaccess`. The same ZIP can overwrite production's robots.txt on staging without changing the separately served policy. Verify the served `/robots.txt` and response headers after every extract, including authenticated directory/index requests. An editor UI error may be diagnosed and the reviewed merged file uploaded through authorized access; a permissions/protection denial is a stop condition. Robots is not access control.
4. Deny PHP execution/access and booking/manage/payment endpoints on staging. Do not copy production data/config/PHP or point a staging form at a production endpoint. Staging is static visual QA, not proof of mail or booking operations.
5. Upload the verified ZIP to a private upload/release folder outside webroots. Extract its **contents** into the verified staging document root. Avoid an extra nested `dist/` or release folder. Never extract the entire GitHub source repository there.
6. Verify `/version.json`, all expected static file hashes, robots/header/auth and key pages. Without shell access, download the release-managed files using configured FTPS/cPanel tooling or a File Manager archive and verify locally:

```bash
python3 scripts/release/package.py verify-tree /path/to/downloaded-staging-root /path/to/manifest.json
```

This checks every release-managed file; a matching `version.json` alone does not prove extraction completed. Preserve and inspect extra server-managed files separately. Do not upload a PHP verifier or web shell.

7. Review home, tours, Weekend in Kabul, contact, Balkh, Wakhan, Wardak and changed pages on mobile/tablet/desktop. Confirm images, navigation, WhatsApp, contact context, shared/private labels and keyboard use. Form submission on static staging must **not** report success without a real JSON `ok: true`; do not treat its expected blocked submission as an email test.
8. Send James the staging URL, release ID/full SHA/ZIP checksum, screenshots, all-file verification result and unresolved decisions. Wait for approval of that exact release.

## 4. Validate the server-managed backend separately

The static ZIP deliberately cannot update PHP or live booking data. Grokbot must compare production PHP and private config with the approved source and report differences. Do not overwrite a working live handler with an old bundle. If backend changes are needed, propose a separate exact file diff and backup/approval step; no blanket dist upload.

The corrected frontend requires an HTTP success response with JSON `ok: true`; successful responses should include `message` and `reference`. Confirm that the production handler implements this contract and stores inquiries before delivery. Preserve inventory, inquiry histories, passwords, ownership and private config. Do not re-import repository seed over live inventory. Reconcile any stale no-JS snapshot or operating dates with James, not invented values.

Check actual SMTP/mail configuration, leadership routing and approved business hours against the current inquiry-operation documents. Confirm James as primary, Ramin as backup and Mohammad for oversight; current settings use 08:00–20:00 Kabul Saturday–Thursday and Friday closed. Verify rather than silently overwrite live settings. Configure/verify the CLI cron using cPanel's actual PHP binary and the actual private store path. Do not expose cron on the public web. Do not deliberately break production SMTP to test failure handling: use isolated test fixtures.

Controlled end-to-end mail tests require an owner-approved test email and clearly marked test inquiries. Verify saved reference, staff receipt, visitor acknowledgement, reply routing, management visibility and retry/escalation behavior without spamming real travelers. A successful JSON response proves acceptance, not mailbox delivery. Static staging cannot prove any of these backend outcomes.

## 5. Production promotion (only after James approves)

1. Reconfirm production has not changed since comparison/staging. Reverify ZIP checksum. Use the **same bytes**, not a rebuild.
2. Create and verify a fresh pre-deploy backup of every file about to be replaced, stored outside webroots. Record files that do not yet exist; those are potential rollback removals. Also retain the full baseline/private-data backup.
3. Prefer the full ZIP for the first deployment. A changes-only ZIP is allowed only when **all** base-managed files match the selected previous manifest and each newly added path is absent. `expected_before`, `added` and `removed_review_only` in `changes.json` assist this check. A version marker by itself is not an adequate base check. Unknown drift means stop or re-baseline, not force a delta.
4. Extract into the verified production root. ZIP extraction is not atomic: use a quiet window and monitor immediately. Assets-first/version-last ordering reduces risk but does not guarantee transactional deployment. Do not use sync/delete options.
5. Do not copy staging passwords, deny rules or noindex policies into production. The ZIP excludes `.htaccess`: compare and manually merge only approved missing redirect/header rules with backup. At minimum check the source's current Spoghmai, Eid-and-Celebrations, Barg-e-Matal and Bashgal aliases, as well as canonical host/HTTPS and the older specialist/hub redirects. Preserve live security, AutoSSL and PHP rules.
6. Verify all manifest hashes (download and run `verify-tree` if needed), `version.json`, live HTTPS/canonical redirects, key pages/images, public accessibility, sitemap and robots. Confirm **no production noindex/password prompt** was introduced. Check the live booking feed, management login and controlled inquiry/mail test from step 4.
7. Only after checks pass, review stale static paths for manual movement to cPanel Trash. Never remove booking/manage/data/.well-known/photo-credits/private files based on a static manifest. Record moves and recovery location. Keep old hashed assets through the rollback/cache window if in doubt.
8. Add a PR entry to `docs/deployments.json` with environment, release ID/SHA/checksum, deployed time, approval reference, verification summary and rollback backup identifier (no credentials, customer data, private contents or publicly reachable backup URLs). Keep “packaged”, “staged” and “live” separate. A ledger-only commit may put main ahead of live without requiring a redeploy.

## 6. Rollback

Restore the exact pre-deploy backup of replaced static files. Remove/move to Trash **only** the newly introduced static files listed in the deploy record and recheck the previous full manifest. Re-extracting an older release alone leaves newly introduced files behind; it is not an exact rollback. Never roll back customer records or live inventory as part of a static rollback. Restore a separately changed server rule/PHP file only from its matching approved backup. Verify public access, booking, inquiries and mail again, then record rollback in the ledger.

## 7. Check repository versus live

```bash
git fetch origin main
python3 scripts/release/check-live.py
```

The script reads `version.json` and reports commits ahead of the marker, or UNKNOWN for a missing/invalid/diverged marker. It does not assert file integrity, server health or delivery. Before the first verified deploy, a missing version.json is expected and must not be treated as “up to date”.

## Reference documentation

- https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- https://docs.cpanel.net/cpanel/domains/domains/
- https://docs.cpanel.net/cpanel/security/directory-privacy/
- https://docs.cpanel.net/cpanel/files/file-manager/
