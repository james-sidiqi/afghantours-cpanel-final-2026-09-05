# AFGHANTOURS-TOUR-REVISIONS-01-05 — implementation report (21 Nov 2026)

Base: `ae73985f` (PR #60 head = staging release; nothing newer on any branch at start).
Branch: `content/tour-revisions-01-05-20261121`. Ivory theme branch NOT included.
Not done (not authorized): merge, staging/cPanel upload, production, live staff Quotation Desk, live `/manage/` inventory.

## 1. Five-tour change matrix

| | Previous | New |
|---|---|---|
| **CAD** `central-afghanistan-discovery` | "Central Afghanistan Discovery", 7 d / 6 n, Kabul → Bamyan → Band-e-Amir → Kabul. Kabul 1, 5, 6; Bamyan 2–4. Day 1 Murad Khane, Babur’s Gardens, Bird Market; Day 2 Salang Pass + Wardak; Day 6 Museum, Darulaman, Sakhi, viewpoint, Chicken Street | **"7-Day Afghanistan Journey"**, 7 d / 6 n, same route and nights (Park Star / Gholghola, standard). Day 1 clothing & tailoring, Museum, Darulaman, Babur’s Gardens; Day 2 Wardak (southern route), Buddha Niches, Bamyan Market; Day 3 Zohak, Gholghola; Day 4 Band-e-Amir + dairy/qurut; Day 5 Sakhi + TV Hill if time; Day 6 Do Shamshira, Bird Market, Wazir Akbar Khan Hill, Mir Zaman box camera; **Day 7 Chicken Street only** |
| **ADTS** `afghanistan-discovery-tour-spring` | 9 d / 8 n, Kabul → Herat → Kabul → Bamyan → Band-e-Amir → Kabul. Kabul 1, 2, 5; Herat 3, 4; Bamyan 6–8; Day 9 return + departure | **10 d / 9 n**, same route. Kabul 1, 2, 5, **9**; Herat 3, 4; Bamyan 6–8. Day 7 adds Dragon Valley; **Day 9** road transfer + conditional OMAR Landmine Museum, Mir Zaman, optional community visit, farewell meal; **Day 10** departure |
| **ADTF** `afghanistan-discovery-tour-fall` | 9 d / 8 n via Herat (domestic flights) | **Unchanged on the site.** PROVISIONAL draft only (`docs/drafts/ADTF-autumn-11d-PROVISIONAL/`, separate commit): 11 d / 10 n, Kabul → Ghazni → Kandahar → Kabul → Bamyan → Band-e-Amir → Kabul, 4WD only; Kabul 1, 2, 6, 10; Ghazni 3; Kandahar 4, 5; Bamyan 7–9; Herat and both flights removed |
| **BSKI** `bamyan-skiing-tour` | 5 d / 4 n. Kabul 1; Bamyan 2–4; Day 5 return + departure | **6 d / 5 n**. Kabul 1, **5**; Bamyan 2–4. Day 1 clothing, briefing, gear check, Sakhi, TV Hill; Day 3 dedicated ski day; Day 4 heritage or optional 2nd ski; Day 5 return + farewell feast; **Day 6** departure. Backcountry, not resort; guides/equipment/rescue only if contracted |
| **PVEH** `panjshir-valley-emeralds-history` | 4 d / 3 n, Kabul 1–3; Day 1 Babur’s Gardens + Chicken Street; Day 2 Jabal Saraj Palace, Massoud Mausoleum, Paryan | 4 d / 3 n, Kabul 1–3, no Panjshir overnight. Day 1 Chicken Street, clothing, orientation (**no Babur’s Gardens**); Day 2 Parwan/Jabal Saraj (town, **palace not listed**), river villages, Massoud Mausoleum, emerald industry, optional auction (private only), Paryan if time; Day 3 Museum, Darulaman, Sakhi, TV Hill, Wazir Akbar Khan Hill; Day 4 Bird Market |

## 2. Images

No image file deleted or replaced. Tour folders checked: none show a destination that leaves its route.
Images that leave a tour page only because the attraction link was removed (files kept, used elsewhere):
- CAD: Murad Khane (`attractions/murad-khane-old-city/hero.webp`), Salang Pass (`attractions/salang-pass/hero.webp`). Kahfroshi moves to Day 6 (kept).
- ADTS: Murad Khane, Kahfroshi Bird Market (Day 1 removed), Salang Pass (Day 6).
- BSKI: Babur’s Gardens (`attractions/baburs-gardens/hero.webp`).
- PVEH: Jabal Saraj Palace (`attractions/jabal-saraj-palace/hero.webp`), Babur’s Gardens.
- ADTF (only if the draft is approved): the four Herat attractions, Salang Pass, Sadaf Hotel card — see the draft’s `proposed-changes.json`.

## 3. Inconsistency report (booking metadata, departures, pricing)

1. **Departures, ADTS and BSKI.** Seed records keep id, start date, status, price and publish flag; end dates moved +1 day to match the new duration: DEP-ADTS-20270320 (→03-29), **DEP-ADTS-20270420 published** (→04-29), DEP-ADTS-20270501 (→05-10); DEP-BSKI-20270116 (→01-21), **DEP-BSKI-20270209 published** (→02-14), DEP-BSKI-20270227 (→03-04). Both published ones have *unknown* legacy traveler counts. `departures.json` is only a seed: the live `/manage/` store is authoritative and is NOT changed by this PR.
2. **Prices unchanged** although ADTS (+1 day) and BSKI (+1 day) grew: ADTS From $1,890, BSKI From $1,300. Catalog entries carry `content_revision.recosting_review_required: true`. ADTF draft keeps $1,950 for a 2-day-longer, flight-free route.
3. **Group size.** `tours.csv` said "Private or 2-8 travelers" (min 2 / max 10–12); the controlling 10 Oct policy and catalog say 6–18 for 5+ day scheduled tours and min 2 / no max for ≤4-day shared. `tours.csv` aligned to the catalog for CAD, ADTS, BSKI, PVEH. Catalog `capacity_reference.live_group_text` still quotes the superseded text (reference only).
4. **Season windows disagree (not changed):** ADTS tours.csv Apr–Jun vs catalog March–May (and departures in March, April, May); PVEH Apr–Oct vs May–September; BSKI Jan–Mar vs 10 Jan–10 Mar.
5. **Hotel star claims.** ADTS/ADTF `accommodation_note` says "3-star and 4-star hotels", but the page shows only standard (3-star) hotels. Not changed (brief names no ADTS hotels). CAD and PVEH notes now name standard hotels without stars.
6. **Malformed inclusion rows.** `tour_inclusions.csv` rows for ADTS, ADTF and CAD contain unquoted commas, so they parse as inactive and never show. CAD’s also named Panjshir; rewritten well-formed with Kabul/Bamyan/Band-e-Amir and kept inactive (nothing new advertised). ADTS/ADTF rows untouched.
7. **CAD legacy departure DEP-CAD-20260912** (history) still flagged 8 days inclusive vs 7 (pre-existing).
8. **Catalog name** changed to "7-Day Afghanistan Journey"; the live `/manage/` store keeps its own copy of the name until updated.
9. **CAD category B** is scheduled + private with minimum 6, so the hero shows "6–18 travelers · minimum 6 to operate" and not "Private".
10. **ADTF draft vs departures:** five 9-day ADTF departure records (two history, three proposed 2027) conflict with 11 days; the validator fails if the draft is applied without a decision on each.
11. Cross-link fixed: the Mazar "Sweet Streets" culinary page linked ADTS and ADTF, but neither route goes to Mazar. Links removed.

## 4. Unresolved questions

See the PR description (same list).

## 5. Rollback

- Before merge: close the PR or delete the branch. Nothing deployed.
- Exclude only the Autumn draft: `git revert 53d903f7` (docs only; no dist impact).
- After a merge: `git revert` the PR’s merge commit, rebuild, and redeploy the previous release (staging currently runs ae73985f; its release ZIP and rollback copies stay as they are).
- The live `/manage/` departures, the booking store and the staff desk are untouched, so there is nothing to roll back there.
