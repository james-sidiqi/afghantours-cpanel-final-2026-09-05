# AfghanTours — short rules for agents

Paste this at the top of any content task.

You write public copy for afghantours.com. Content only. No new URLs, no layout, no deploy unless the release drive explicitly authorizes engineering work.

Brand: licensed Kabul operator (James Tourist & Travel Agency, ATO-KBL-1617), American-led, 15+ years on the ground. Knowledgeable, grounded, no luxury theater, no conflict-tourism.

**Chrome locks**
- Header brand: **Afghan Tours** only
- Footer legal: **James Tourist & Travel Agency**
- Safety: do **not** use “Your safety is planned, not promised.” (James rejected). Prefer inherent-risk / route-aware planning language.

Locked:

- Phone +93 780 123 456 / wa.me/93780123456 — real, keep
- LOI support for every booked tour
- Do not say we issue visas
- Armored vehicle = premium on request, not homepage
- Jam / Ghor = not in winter; no invented tour slug
- Kabul–Bamyan road = whichever pass fits conditions that week
- Panjshir = no “defiant,” no “historically safe”
- No traveler quotes unless the owner pastes one
- No inclusions/price table unless the owner approves the exact lines
- American-led: yes, publish
- Do not invent prices/dates/venues/safety/visa facts
- Do not silently change product `is_active` when ambiguous — document in `docs/NEEDS-JAMES-DECISIONS.md`

Never invent facts. If missing, write `[OWNER INPUT REQUIRED: question]` or file under `docs/NEEDS-*.md`.

Never: safe/secure/guaranteed, most trusted, unforgettable, hidden gem, tapestry, ultimate adventure, peacetime, itinerary CSV, $Inquire, Inquire Days, fake tour names (Westward Exploration, Classical Afghanistan Tour, Highland Expedition, Custom Adventure, Adventure Custom, Custom Day Trips, bare Discovery Tour).

Always: **live canonical routes only**; KEEP good existing copy; one concrete image per paragraph; page ends on a live tour, `/custom-requests/`, `/specialist-services/`, `/return-journeys/`, `/contact/`, or WhatsApp.

**Retired public tour URLs (do not link):**
`/tours/photography-tour/`, `/tours/scientific-expeditions/`, `/tours/media-support/`, `/tours/business-investment/`, `/tours/noshaq-expedition-support/`, `/tours/ski-expeditions/`, `/tours/veteran-return/`, `/tours/custom-expedition/` — these 301 to specialist / return / custom-requests. Prefer the canonical targets in new copy.

Reuse: “We do not sell fantasy itineraries.” “Afghanistan is not a checkbox. It is a conversation.” Do not reuse “Your safety is planned, not promised.”

Inquiry links: use `src/lib/inquiry.ts` helpers (`buildTourInquiryHref`, etc.) — canonical params `flow`, `entity_type`, `entity_code`, `entity_slug`, `entity_name`, `product_class`.

Dist: generate only via `npm run build`; never hand-edit `dist/`. This repo tracks dist for cPanel.

Full rulebook: `CONTENT-GUIDELINES.md`
