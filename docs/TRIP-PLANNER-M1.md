# AfghanTours Unified Trip Planner — M1 gate record

Status: M1 source inventory, architecture and contract-only change. No runtime feature, server upload, migration or release has been made by this PR. Source branch: images/mbp-consolidation-20261102 at d563270b16c29eed4655bcb2a435c0296a95ebea (draft PR #50). PR target: main. M2/M3/M4 are not authorized by this change.

## Inventory and integration points

- Astro 4 static site. npm ci; npm run build; generated dist/ is force-tracked. Do not hand-edit dist or put the private PHP application inside a static release ZIP.
- Verified source-branch dist/sitemap.xml: 298 URL entries. This M1 changes no Astro pages, public links, image assets, or existing routes. CI enforces the unchanged count.
- Existing /custom-requests/ page calls the canonical custom inquiry builder in src/lib/inquiry.ts and ultimately /contact/. Existing public/tour-inquiry.php handles legacy inquiries. Neither endpoint is modified or used for structured trip-planner intake.
- Data IDs: data/tours.csv (tour_code); data/tour_itinerary.csv (tour_code, day_number, attraction_codes, overnight_hub); data/hotel_properties.csv (hotel_id); data/hotel_rooms.csv (hotel_id, room_id); data/provinces.csv (province_code); data/activities.csv (activity_code); data/attractions_master.csv (attraction_code). All images must be resolved through existing approved published asset paths, never AI/stock placeholders.
- Tour images: hero_image_path/thumbnail_image_path; hotel properties: hero_image/gallery_folder; rooms: hero_image; provinces: cover_image_path/square_image_path; activities: image_path; attractions: hero_image/card_image. Only approved active entries; verify each resolved /assets/ path remains within the approved asset root.
- Staging runbook at docs/RELEASE-RUNBOOK.md explicitly denies PHP/booking/manage/payment endpoints on staging; server-owned PHP is excluded from static releases. The release staging fragment governs robots and noindex, not permission to enable PHP.
- Source pricing archive (attached owner handoff, NOT in Git): 28/28 SHA-256 manifest entries verified locally. Cost rows: 125 AFN band items (28 unpriced), 73 historical register, 14 hotel historical ranges, 65 attraction fee references, 6 capacity rules, 15 published tour comparisons and 43 website room cost/sell comparisons. These are historical references, not live verified supplier quotes.
- User assumptions are distinct: guide USD 50 per day, driver USD 30 per day all-inclusive, standard Kabul room USD 80 per night; planning FX 65 AFN/USD; tourist activity province pass USD 20 per guest (16 government + 4 administration). No flight, hotel availability, card/HesabPay fee or tax is assumed verified.

## Architecture / boundaries

1. M2 private staff workspace: /private-calculator/ is a separately deployed, authenticated PHP application and NOT a static Astro page. Keep existing staging Directory Privacy as the outer gate and independent PHP staff login inside it. Login via password_hash/password_verify, secure HttpOnly SameSite session cookie scoped to /private-calculator/, session rotation, CSRF token validation for mutations, login throttling, logout, authorization and audit trails. Read credentials and private source registers solely from configured files outside ALL document roots. No private cost, staff margins, customer submissions, proposal snapshots, or workbook bytes in client-side JS/HTML or fetchable static files.
2. M3 public trip builder: separate Astro prototype on staging, distinct from the existing /custom-requests/ page until reviewed. Send its bounded schema-versioned selection to a NEW /trip-planner-intake/ PHP adapter, never /booking/, /manage/ or /tour-inquiry.php. Store immutable submitted selections under a server-generated nonenumerable ID outside the docroot; send notifications without raw sensitive details; return only reference and 'Trip request received. Availability and prices will be confirmed by AfghanTours.' Never 'confirmed booking', payment capture or claims of live inventory.
3. Shared model: trip-planner/contracts/public-request.v1.schema.json describes untrusted customer selections; staff-proposal.v1.schema.json describes private revisions and pricing source labels. The public JSON contract EXCLUDES cost sheets, fees, supplier names, margin, markup and internal staff notes. Public indicative bands require independently approved safe selling-price policy from M3; if unavailable return 'Price to be confirmed'.
4. M2/M3 persistent storage and config: server-only directory /home/jamesbon/private/afghantours-trip-planner/ subject to actual account-root verification. Do not store records only in localStorage or directly in docroot. Use separate write-controlled folders for credentials, rates, lead/quote versions and encrypted or protected audit logs. Immutable customer snapshot and versioned staff revisions; client PDF is an explicit approved export with embedded validated site images, no private costing.
5. Site asset reference and source-price catalogs are READ ONLY until owner approval; internal rate updates use separate provenance/version and never rewrite source workbooks.

## Scoped PHP deployment — design, NOT a change to staging yet

Proposed document root (UNVERIFIED until cPanel inspection):
- /home/jamesbon/staging.afghantours.com/private-calculator/index.php and child .htaccess — M2 protected application only.
- /home/jamesbon/staging.afghantours.com/trip-planner-intake/index.php and child .htaccess — M3 public-builder POST adapter only (still behind outer staging auth while staging is private).
- Future M3 Astro prototype in an approved NEW test route, created by normal npm build + force-added dist, not by hand-editing dist.

Proposed outside document root (UNVERIFIED):
- /home/jamesbon/private/afghantours-trip-planner/config/auth.php
- /home/jamesbon/private/afghantours-trip-planner/config/app.php
- /home/jamesbon/private/afghantours-trip-planner/cost-registers/ [all original cost registers unchanged]
- /home/jamesbon/private/afghantours-trip-planner/source-workbooks/ [original files unchanged]
- /home/jamesbon/private/afghantours-trip-planner/storage/leads/
- /home/jamesbon/private/afghantours-trip-planner/storage/proposals/
- /home/jamesbon/private/afghantours-trip-planner/storage/audit/

PHP >=8.1, sessions, strong password hashing, HTTPS, cPanel Directory Privacy and writable private storage need live server verification. Child .htaccess files may DENY extraneous files, limit methods, and set security headers, but MUST NOT be assumed to defeat inherited PHP denial. If PHP is blocked at a parent, vhost or security/WAF level, STOP; request a separately approved narrow exception for only the two child handler paths. Never replace or loosen the staging root .htaccess, auth, /booking/, /manage/ or payment rules. Future static release packaging excludes the PHP paths, so the hosting bot must verify they survive a staging release.

## Contract and financial invariants

- Public selects dates/flexibility, travelers/rooms, locations, travel mode, interests, pace, optional activities, budget, and a possible day sequence. Staff revisions never rewrite the original customer submission.
- Source classes (all separately labeled): operator_assumption, historical_supplier_afn, historical_hotel_afn, website_hotel_cost_usd, website_hotel_sell_usd, website_tour_price_from_usd, approved_supplier_quote. All retain source/provenance, currency, rate unit, verification status, effective date, and last checked.
- Staff calculator in M2 must use complete cost / (1 - gross margin), with disclosed tax/payment fee bases and denominator guards; missing mandatory components block 'approved' while drafts remain possible. Trips >=5 days use six guests as group viability baseline; smaller private groups remain requestable.
- No price on public output unless from explicitly approved customer-safe indicative rule. Supplier costs, staff compensation, internal profit, assumptions and rate sheets never travel via public HTML or adapter responses.
- No availability claims or reservations from a submitted draft. Inbound reference is a request ID, not booking reference.

## Tests and M1 gate

- scripts/trip-planner/check-m1.py runs in CI after the existing QA build. It checks dist/sitemap.xml remains at 298 URLs; checks public/ and dist/ for prohibited private rate/data markers; checks new schemas and the contract example. This is NOT a full cPanel access test.
- 28/28 private archive hashes verified independently from the owner handoff; private archive is NOT committed or deployed. Future M2 staging integrity must be rechecked against original manifest in private storage.
- Still NOT VERIFIED: actual cPanel roots, effective inherited staging PHP deny rules, server PHP version/config, authenticated and unauthenticated requests, source & staging backup/snapshot evidence, public response leakage, persist/restore, user-device/browser testing, and a real proposal PDF. No quote sample exists in M1.
- Owner instruction: NO BACKUPS. None created. The spec/runbook require staging/source backups: record this as an explicit **M1 gate exception / blocker** and do not quietly declare backup/rollback readiness or deploy.
- No production, payments PR #17, bookings, manage, existing inquiry, staging server, current credentials or existing deployed release changed. No merge/deploy authorized.

## Handoff to M2 (only after M1 gate)

Owner/hosting agent must inspect the real cPanel configuration, resolve the required backup exception and scoped PHP approval, verify nested authentication, and establish storage/config outside docroot. M2 builds private CRM-lite staff intake, day editor, supplier cost engine, asset selection, immutable proposals and client-safe quote/PDF preview. M3 then builds the public wizard plus isolated intake adapter. M4 is end-to-end mobile, security, integrity and owner acceptance. Stop at this M1 gate.
