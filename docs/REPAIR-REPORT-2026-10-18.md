# Repository repair report — 18 October 2026 (Kabul)

Baseline: main `9c5eda2de2556b222ab2eea3cdbed7a987b4f58e`. Repair branch includes PR #41 (`a40ddcf879d51b8eabd8c89cc6a0524124efd537`) to preserve its live-image sync; its pending owner decisions remain pending. Coordination: issue #42. No hosting mutation or production deployment is asserted by this report.

## Confirmed problems repaired

1. Both inquiry forms treated an HTTP-200 HTML error or empty JSON object as success. They now require explicit JSON `ok: true`, preserve input on failure, prevent duplicate concurrent submission, time out stalled requests and show the returned reference. The tour dialog no longer disappears before a traveler can copy that reference.
2. The tour inquiry dialog lacked keyboard containment/Escape/focus return. Added keyboard handling and an explicit focusable dialog panel.
3. Opening Weekend in Kabul from a homepage featured preview did not reveal Weekend-specific arrival/extras fields. Detection now uses the selected tour slug, not only the current page URL.
4. Featured tour badges used legacy product classifications while prices used the current booking catalog. Both featured and directory labels now share the canonical catalog helper. No prices, rules, legal text or operating dates were invented or changed.
5. Legacy cPanel deployment copied the entire dist tree, including backend material. `.cpanel.yml` now fails closed, obsolete docs point to the new runbook, and a manually initiated main/green-CI-gated release workflow builds allowlisted static ZIPs with manifests, checksums, version markers and optional base-checked deltas. No hosting credentials or deployment step are added to GitHub.
6. CI now includes the existing inquiry-mail suite, release-packager unit tests and mocked browser regressions at mobile/tablet/desktop sizes, with the same QA script used by release builds.
7. Astro prerender module leftovers are removed from the static build by an exact-name guarded cleanup; the release allowlist independently excludes server modules and protected/private paths.
8. Added the staging-first runbook, a separate copyable Grokbot prompt, a short owner content-change workflow, read-only live-marker comparison and an initially empty deployment ledger. Rollback documents removal of only recorded new static files; re-extracting an old ZIP alone is not claimed to be exact.

## Evidence and verification boundaries

Fresh Node 20 build: 318 HTML files, 300 sitemap URLs. Internal-link audit: 24,177 links, zero broken targets. Image audit: zero missing references. Strict integrity audit: zero errors/warnings (13 informational itinerary-normalization notes). Slug audit: 328 entries, no duplicates. Inquiry entrypoints: 10/10. Tour image identity: 13/13. Booking core and policy tests: 164 passing. Release-packager tests: eight passing.

Browser coverage tests both forms against false-success responses and explicit-success references, dialog keyboard behavior, Weekend fields, consistent labels, JavaScript exceptions and horizontal overflow at 390/820/1440px. Submissions are intercepted locally; no traveler email is sent. The exact PR's CI is the authoritative final result, not an earlier local run.

PHP CLI is unavailable in the editing environment. PHP lint/core/parity/integration/mail tests must pass in GitHub CI before merge. The complete release workflow itself requires approved main and has not been used to publish or deploy this branch. Production `version.json` returned 404 at inspection; no release identity could be verified from live. A matching marker will still not replace all-file verification.

## Remaining hosting/owner gates (not solved by static code)

- Grokbot must verify the actual cPanel roots/capabilities, backups, live drift, DNS/SSL and isolated staging protection. The hosting capability report came from Grokbot, not direct Codex access.
- Resolve PR #41's Balkh image provenance/no-AI and credit questions plus the Wardak selection. Preserve owner changes; do not invent image credits or silently replace live imagery.
- Compare server-managed PHP/config, confirm the explicit JSON success contract and prove actual mail receipt/reply/acknowledgement and cron behavior with approved test recipients. Static staging intentionally cannot send inquiries or run booking/admin.
- Review current live departure status/counts and stale snapshots with the owner. Repository validation does not imply that proposed or unknown inventory is approved; never re-seed over live data.
- Verify current redirects in server-owned `.htaccess` without replacing the entire file. Keep staging auth/noindex controls off production.
- James reviews the staged exact release and approves production promotion. Record real results in the ledger only after deployment. Leave payment PR #17 out.

The September uploaded CSV/image/HTML handoffs were inspected as historical material, not used to overwrite the current GitHub source or assumed to match today's live site. The uploaded `afghantours-cpanel-final-2026-09-05.zip` could not be opened from the attachment workspace; its contents were not used.
