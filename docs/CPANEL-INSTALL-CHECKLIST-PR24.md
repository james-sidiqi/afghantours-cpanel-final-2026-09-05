# cPanel install checklist — PR #24 (inquiry email routing)

> Backend reference only. Read [the current release runbook](RELEASE-RUNBOOK.md) first. PHP/private data are excluded from static releases; compare actual live versions and use a separately approved backup/diff before backend changes. Never upload all of dist or overwrite inventory.

Package: `/workspace/afghantours-pr24-deploy.zip` (306 docroot files + MANIFEST.txt with SHA-256 of each).
Do these steps only after James has authorized the deployment. Full details are in `docs/ADMIN-EMAIL-SETUP.md`.

## A. Mail setup (cPanel → Email)
1. **Email Accounts.** Check that info@, james@ and ramin@ exist.
   - **Create** reservations@, mohammad@ and **website@** (the website's send-only SMTP account). Use strong passwords and a quota of at least 2 GB.
   - Leave website@ with no forwarders and no autoresponder.
2. **Forwarders.** Set these up on info@ and reservations@ ONLY, each to james@, ramin@ and mohammad@.
   - Keep the local copy (this is the cPanel default).
   - Use "Trace" on both addresses. Each must end at 4 mailboxes with no loop.
3. **Autoresponders.** Set one on info@ (From "AfghanTours", the general text) and one on reservations@ (From "AfghanTours Reservations", the reservations text). The exact texts are in the setup doc, section 3.
   - Settings for both: interval 1 hour, UTF-8, HTML off.
4. All five personal/role mailboxes stay independent mailboxes. Roles are unchanged.
5. DNS: no changes. SPF and DMARC stay as they are (James's decision).

## B. Private config, edited by hand (NOT part of the zip)
6. Edit `/home/jamesbon/afghantours-private/booking-config.php` in File Manager and keep it at chmod 600.
   - Add the `'mail' => [...]` block and the top-level `'escalation' => [...]` line from `docs/booking/booking-config.example.php`.
   - Type the website@ password into `smtp.pass` on the server only.
   - Keep `'leadership_copies' => 'direct'` until step 2 is verified, then switch to `'forwarder'`.
   - Keep `'escalation' => ['enabled' => false, …]`.
7. `owners` usernames must match `/manage/` logins. Ramin and Mohammad need `/manage/` accounts before they can claim an inquiry.

## C. Back up, then upload
8. Back up the files about to be replaced into `/home/jamesbon/afghantours-private/pre-deploy-pr24-<date>/`:
   - `tour-inquiry.php`
   - `manage/index.php`
   - `booking/lib/` (the whole folder)
   - every `*.html` listed in MANIFEST.txt (simplest: compress the whole docroot's `*.html` plus those three)
   - `.htaccess`
9. Upload `afghantours-pr24-deploy.zip` to `/home/jamesbon/afghantours.com/` and Extract there, overwriting existing files.
10. Delete the uploaded zip and `MANIFEST.txt` from the docroot.
11. Spot-check 3 files' SHA-256 against MANIFEST (cPanel Terminal: `sha256sum tour-inquiry.php`).

## D. Cron
12. Cron Jobs → every 5 minutes:
```
*/5 * * * * /usr/local/bin/php -q /home/jamesbon/afghantours.com/booking/lib/inquiry-cron.php >> /home/jamesbon/afghantours-private/booking/inquiry-cron.log 2>&1
```
13. After 5 minutes the log shows a line ending in `escalation=off`.

## E. Post-upload checks
14. `https://afghantours.com/booking/lib/inquiry-mail.php` returns 403 (not code and not a 500).
15. The homepage, a tour page, `/contact/` and `/transportation/` all load.
   - `/contact/` shows the "Tour reservations: reservations@…" line.
   - WhatsApp links open with the prefilled text.
16. `/manage/`: log in. Inquiries shows Owner and Email/ack columns, and the "Mail failures" page loads.

## F. Real delivery tests (use a personal Gmail)
17. Contact form: info@ (plus leadership) receives a `[AT-2026-…]` notification with Reply-To set to your Gmail. Gmail gets exactly ONE acknowledgement, "Thank You for Contacting AfghanTours", with the reference.
18. Tour inquiry: the same, but to reservations@, with the "AfghanTours — Your Tour Inquiry Has Been Received" acknowledgement.
19. Check that no cPanel autoresponse was sent to website@ and no second reply reached Gmail.
20. In Gmail, "Show original" on the acknowledgement must show `spf=pass` and `dkim=pass`, with From `<website@afghantours.com>`.
21. Email info@ and reservations@ directly from Gmail: the autoresponder replies once, and the forwarders deliver to all three leadership mailboxes.
22. Failure path: put a wrong `smtp.pass` and submit. The visitor still sees a reference, and the inquiry appears in Mail failures. Restore the password; within 5 minutes cron delivers it and you receive exactly one acknowledgement.
23. In `/manage/`, try Claim, Transfer (the notice arrives) and Record response on a test inquiry. Then close the test inquiries.

## G. Rollback
24. Restore the step-8 backup over the docroot: `tour-inquiry.php`, `manage/index.php`, `booking/lib/` and the HTML files.
25. Delete `booking/lib/inquiry-mail.php` and `booking/lib/inquiry-cron.php`, plus `_astro/hoisted.B52lhCX6.js` if you want it gone. Remove the cron job.
26. Inquiries already stored in `afghantours-private/booking/` stay readable. Do not delete `inquiries.jsonl`, `inquiry-status.json` or `inquiry-seq.json`.
27. The old `_astro/hoisted.kYURd7W3.js` is still on the server, so the restored HTML works.
