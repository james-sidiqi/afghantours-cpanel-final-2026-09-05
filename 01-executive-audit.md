# Deliverable 1 — Executive Content Audit (Pass 2)

Live crawl of 152 public URLs on 31 August 2026. Footer links `/provinces/` and `/regions/` return 404.

## Overall assessment

The brand idea is already right: Kabul-based, licensed, hospitality-first, operationally realistic. Homepage H1, Transportation, Visa disclaimer, Kabul hub overview, and most **Cultural Experience** pages are written like a serious operator.

The site fails as a conversion system because product pages were generated from templates and data files, then left half-human. A careful traveler will notice:

- public pages that mention an internal **“itinerary CSV”**
- duration/price fields that say **Inquire Days** and **$Inquire**
- food pages that repeat the same four paragraphs
- destination pages that list tour names that do not match live slugs
- Safety and FAQ pages that are too thin for Afghanistan

Positioning should stay. Template residue should go.

## Strongest content — KEEP or MINOR EDIT

- Homepage H1: “Come for the history, stay for the hospitality”
- Homepage custom-audience tiles (photographers, veterans, researchers, diaspora, media, mountaineers)
- Transportation page (best planning page; only retitle “Hassle-Free” and confirm vehicles)
- Visa & Entry disclaimer: AfghanTours does not issue visas
- About leadership block (James “Amir” Sidiqi / Mohammad “Edrees” Rahimi)
- Kabul City hub overview (altitude, traffic, photography of government buildings)
- Cultural Experience pages as a set — these are the site’s best long-form writing:
  - Buzkashi
  - Istalif pottery
  - Kuchi nomads
  - Pahlawani
  - Afghan carpets
  - Gudiparan bazi / kaftar bazi
  - Glassblowers of Herat
  - Eid and celebrations
  - Paktika livestock markets
- Tashqurghan/Kholm dried-fruit page (short but specific; expand, do not replace the core)
- Destination “Why Visit” paragraphs on Bamyan, Herat, Balkh, Kabul, Kandahar (local facts exist under brochure titles)
- Terms line: “Inquiries are not bookings”
- Tour “Planning Notes” caveat on structured itineraries (honest)

## Weakest content

1. Safety page — three short blocks. Highest-trust page is the thinnest.
2. Specialist tour shells — Veteran Return, Media Support, Business Investment, Ski Expeditions: “Inquire Days”, “$Inquire”, “Day-by-day details are managed through the itinerary CSV.”
3. Veteran Return meta/H1: “highly secure journey” and “peacetime reality.”
4. Featured tour template — identical “What This Tour Is For,” raw route strings (`Kabul → Kabul to Bamyan → …`), highlight tautologies, duplicated hub/province cards.
5. Food library — 20 pages share the four-paragraph Cultural Context / Expect / Regional / Traveler Notes block. Wardak Apples is an H1 with no body. Ghazni Pulao is one sentence plus a different short boilerplate.
6. Generic food meta on ~40 URLs: “Professional Afghanistan travel, licensed itinerary planning, provincial permits, safe operational access…”
7. FAQ — five answers.
8. Privacy/Terms — structurally correct but incomplete for a booking business.
9. Footer “Provinces” and “Regions” 404.
10. Hotel star ratings and “pinnacle of luxury” / “high-security standards.”

## Most repetitive sections

- Food four-paragraph block (20 files)
- Food meta “safe operational access…” (~40 files)
- Destination travel-notes pair (34/34): conservative pacing + provincial tourist permits
- Destination “Open each card for a quick preview…”
- Destination “Tours that visit this province…” + “No related tours have been linked yet.” (26 pages)
- Tour hub blurb and province blurb
- License number ATO-KBL-1617 on Home, About, Transportation, and every footer
- “American-Led, Kabul-Based Operations” on Home / About / Contact

## Highest-conversion opportunities

1. Delete CSV / Inquire Days / $Inquire from public tours.
2. Rewrite Safety and expand FAQ.
3. Give each featured tour a unique “who this is for” and a clean hub route.
4. Keep Cultural Experience pages and add “what you may actually see” + owner-confirmed journey links.
5. Expand Tashqurghan; write real Qabuli/Palaw copy on a live URL.
6. Contact: what happens after submit; real phone.

## Highest-trust issues

| Issue | Why it matters | Priority |
|---|---|---|
| “itinerary CSV” on 5 tour pages | Exposes unfinished CMS to buyers | P0 |
| “Inquire Days” / “$Inquire” | Looks like a draft site | P0 |
| Veteran Return “highly secure” / “peacetime reality” | Overpromise + contested framing | P0 |
| Safety page depth | Serious travelers decide here | P0 |
| “safe operational access” in About + 40 metas | Violates no-overpromise rule | P0 |
| Published prices without inclusions (where numeric prices exist) | Complaint / legal risk | P0 |
| Hotel “high-security” / star guarantees | Unverified quality claims | P1 |
| Destination tour names that do not match slugs | Broken information architecture | P1 |
| Footer 404s for Provinces / Regions | Unfinished chrome | P1 |

## Ranked findings

**P0**
- Keep published phone/WhatsApp `+93 780 123 456` as-is (owner confirmed live; sequential digits were a false flag).
- Remove “itinerary CSV”, “Inquire Days”, “$Inquire”, “Inquire days of guided travel.”
- Rewrite Safety.
- Soften About “safe operational access” / “unforgettable.”
- Rewrite Veteran Return positioning (no “highly secure”, no “peacetime reality”).
- Confirm or hide numeric “From $” figures and inclusions.
- Confirm or remove Contact “within 24 hours.”
- Strip “safe operational access” from food metas.

**P1**
- Unique featured-tour intros, routes, highlights.
- Deduplicate hub/province cards on tours.
- Replace food boilerplate on flagship dishes; fill empty pages (Wardak Apples).
- Expand FAQ; add post-inquiry Contact copy.
- About: canonical license display; remove empty testimonials heading if no quotes.
- Hotels: reference-list tone, no star/security guarantees.
- Destination tour-link names must match live URLs or be removed.
- Cultural Experience: add etiquette + owner-confirmed related journeys.
- Legal pages: retention, payments, cancellation — owner/legal text only.

**P2**
- Destination card superlatives (“crown jewel”, “world’s largest pistachio forests”).
- Attraction clichés (“Grand Canyon of Afghanistan”, “breathtaking natural spectacles”).
- Hubs index intro explaining city hub vs province.
- Merge or disambiguate `/hubs/kabul/` vs `/hubs/kabul-city/` (and Bamyan/Herat/Ghazni/Kandahar pairs).
- Qabuli spelling + 404 `/food-culture/dishes/kabuli-pulao/`.
- Long-tail food URLs after flagship set.

**P3**
- Homepage eyebrow “Afghanistan Reimagined.”
- License number reduced to About + one footer mention.
- Image captions (Deliverable 8).
