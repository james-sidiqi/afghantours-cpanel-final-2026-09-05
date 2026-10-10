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
| `booking/inventory.json` | tours (booking fields), departures, blackouts, settings — written atomically under an exclusive lock |
| `booking/travelers.json` | traveler records per departure (name, contact, party size, status, payment status) — **PII** |
| `booking/inquiries.jsonl` | every website inquiry (one JSON per line) — **PII** |
| `booking/audit.log` (JSON lines) | who changed what and when |
| `booking/sessions/`, `login-attempts.json` | admin sessions and login rate-limit |

None of these is ever copied into `dist/` or returned by `/booking/departures.php`.

## Workflow

1. **Departures** (home): filter Upcoming / Proposed & draft / History / All. Each row shows stored status, computed customer
   status, confirmed/pending counts, approval, published flag and date-check warnings.
2. **Review a proposed departure** → *Edit*: set **maximum capacity** (required before publishing), check dates (end date
   auto = start + days − 1; mismatches are refused unless "keep existing production dates" is ticked), price, cutoff, public note.
   Then *Publish*. It appears publicly as **Available — Awaiting Minimum**.
3. **Travelers**: add each traveler/party as *pending*; switch to *confirmed* only when they have committed and paid
   (payment status is a manual note: not recorded / deposit recorded / paid recorded — **no online payment is wired**).
   Only confirmed travelers count toward the minimum of 3.
4. **Approve** (operational approval). The departure shows **Confirmed Departure** only when confirmed ≥ minimum **and**
   approved; **Limited Places** when few seats remain; **Sold Out** at capacity. Nothing is confirmed automatically.
5. **Close** (stop requests), **Cancel**, **Complete** (only on/after the end date), **Unpublish**, **Reopen**.
6. **Inquiries**: list and open each request; set status (new / contacted / booking approved / declined / closed); "Add to
   departure as pending traveler" for requests that named a departure.
7. **Tours & pricing**: reference "from" price, price status (`reference_from_production` → `approved` after review),
   show price on site or "Price on request", private-tour availability. Changing a tour price also updates its shared
   departures that still carried the old price.
8. **Blackout dates**: add / confirm / delete. Eid 2027 dates are pre-filled as *estimates* — confirm or correct them.
   Publishing a departure that overlaps a confirmed blocking blackout is refused.
9. **Settings**: `usd_confirmed` (shows "USD" instead of "$"), limited-places threshold, show confirmed counts publicly
   ("2 of 3 travelers confirmed"), show capacity publicly. All default off.
