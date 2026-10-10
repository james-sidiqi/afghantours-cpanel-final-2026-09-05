# Departure inventory admin (`/manage/`) — setup and workflow

Nothing here is live until the site is deployed **and** the private config exists. Without the config, `/manage/` shows
"Admin not configured" (HTTP 503) and nothing can be edited; the public site keeps working from the read-only seed.

## One-time setup on cPanel (after deploy)

1. Private folder (same one PR #17 uses): `/home/jamesbon/afghantours-private/` — outside `/home/jamesbon/afghantours.com`.
   Create `booking/` inside it, permissions 700. PHP must be able to write there.
2. Make a password hash on any machine with PHP: `php scripts/booking/hash-password.php` (12+ characters).
3. Copy `docs/booking/booking-config.example.php` to `/home/jamesbon/afghantours-private/booking-config.php` (chmod 600),
   add users. Roles: `admin` (can edit) or `viewer` (read-only).
4. Open `https://afghantours.com/manage/`, sign in. The first request to the booking code imports the seed
   (`dist/booking/seed/*.json`) into `afghantours-private/booking/inventory.json`. From then on that file is the only source of truth.

Overrides (env vars, normally unset): `AFGHANTOURS_PRIVATE_DIR`, `AFGHANTOURS_BOOKING_CONFIG`, `AFGHANTOURS_BOOKING_SEED_DIR`,
`BOOKING_TODAY` (tests only — pins "today").

## Files in the private store

| File | Contents |
|---|---|
| `booking/inventory.json` | tours (booking fields), departures, religious calendar, other blackouts, settings — written atomically under an exclusive lock |
| `booking/travelers.json` | traveler records per departure (name, contact, party size, status, payment status) — **PII** |
| `booking/inquiries.jsonl` | every website inquiry (one JSON per line) — **PII** |
| `booking/audit.log` (JSON lines) | who changed what and when |
| `booking/sessions/`, `login-attempts.json` | admin sessions and login rate-limit |

None of these is ever copied into `dist/` or returned by `/booking/departures.php`.

## Workflow

1. **Departures** (home): filter Upcoming / Proposed & draft / History / All. Each row shows stored status, computed customer
   status, confirmed/pending counts, approval, published flag and date-check warnings.
2. **Review a proposed departure** → *Edit*: 5+ day shared departures default to minimum 6 / maximum 18; shared departures of 4 days or less to minimum 2 with no standard maximum. Other numbers need an **approved group-size exception** note, check dates (end date
   auto = start + days − 1; mismatches are refused unless "keep existing production dates" is ticked), price, cutoff, public note.
   Then *Publish*. It appears publicly as **Open — awaiting minimum 6 travelers** (or 2 for shared departures of 4 days or less).
3. **Travelers / bookings**: add each traveler/party as *Requested*; switch to *Booking confirmed (accepted)* when accepted, and set
   **Payment received (recorded by admin)** once the deposit/payment has actually arrived. The deposit amount/timing is an owner
   decision not yet made, so the system only stores this yes/no record — **no online payment is wired** (PR #17 stays disabled).
   A traveler counts toward the minimum only when the booking is accepted **and** payment is recorded as received; inquiries and
   accepted-but-unpaid bookings never count (the departure page shows them separately). Accepting a booking issues a booking
   reference (`ATB-YYYY-XXXXXX`). Each booking record also carries `terms_acceptance` / `policy_acceptance` (null until a future
   transactional booking flow records `{document, version, effective_date, accepted_at, method}`) — there is no acceptance UI and
   general inquiries never require acceptance. Open a confirmed booking's **Booking confirmation** for the record + email text
   (Ramadan departures include the full Ramadan Travel Advisory). Nothing is sent automatically.
4. **Approve** (operational approval). **Confirmed** = counted travelers ≥ minimum **and** approved. **Limited** is manual only
   (*Mark Limited*); there is no automatic "few places" threshold. **Sold out** is automatic only where a capacity is set.
   **Closed** is manual; booking cutoffs do not close departures (`auto_cutoff_close` is off until a cutoff rule is approved).
5. **Close** (stop requests), **Cancel**, **Complete** (only on/after the end date), **Unpublish**, **Reopen**.
6. **Prices**: a production reference price is **not** approval. A proposed departure cannot be published (or approved while
   unpublished) until **Price approved by owner** is ticked on its edit form (who/when is recorded).
7. **Religious calendar**: per year — Ramadan start/end, Eid al-Fitr date, Eid al-Adha date, each `estimated | confirmed` with a
   source note (2027 seeded as astronomical estimates). Customers see estimated dates as "expected".
   - **Ramadan = advisory only.** Any departure whose full date range overlaps Ramadan shows the compact Ramadan line and the full
     Ramadan Travel Advisory. It stays bookable; nothing closes.
   - **Eid = five-day block** (day before Eid, Eid day, +1, +2, +3) for **standard scheduled (shared)** departures. Any overlap of
     the full range is a conflict: the departure is flagged on Departures/Edit (**Eid conflict — review required**), hidden from
     the public feed, and publish/approve are refused — it is never moved or deleted. An admin can record an explicit override +
     note (*Record Eid review override*); the override is tied to those block dates, so if the Eid date changes it must be
     reviewed again. Saving the calendar revalidates every published/proposed departure and reports new conflicts.
   - **Private / custom / specialist requests in an Eid block** go to **manual review**: inquiries are stored with a
     `manual_review` flag and a checklist (guide, driver, vehicle availability, hotels, domestic transport, site access, meals,
     local operating conditions, itinerary feasibility); a private-departure booking cannot be confirmed without a review note.
     Never promise an Eid request can be accommodated.
8. **Inquiries**: list and open each request; set status; complete the manual-review checklist where flagged; "Add to departure
   as pending traveler" for requests that named a departure.
9. **Tours & pricing**: reference "from" price, price status, show price on site or "Price on request", private-tour
   availability. Changing a tour price also updates its shared departures that still carried the old price.
10. **Other blackout dates**: non-religious blackouts (add / confirm / delete).
11. **Settings**: `usd_confirmed` (shows "USD" instead of "$"), show confirmed counts publicly ("2 of 6 travelers confirmed"),
    show capacity publicly. All default off.

## Cancellation, Refund & Rescheduling Policy route

`/cancellation-refund-rescheduling/` renders `src/content/legal/cancellation-refund-rescheduling.md`. The owner's full policy
(effective 28 Sep 2026) has not been provided to the repo yet, so `policy_full_text_received: false`: the route is not built,
not in the sitemap, not linked from /terms/ (`POLICY_PREVIEW=1 npm run build` makes a noindex staff preview). To publish:
paste the full text verbatim at the MERGE POINT, move the staged owner-approved additions into the right sections, set the
version and flip the flag to `true`, rebuild. The validator checks the /terms/ clause and the staged text stay identical on the
minimum-group sentence.
