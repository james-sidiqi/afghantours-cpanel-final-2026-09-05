# ADTF — Afghanistan Discovery Tour Autumn — 11-day route (PROVISIONAL)

Batch: AFGHANTOURS-TOUR-REVISIONS-01-05 (owner brief 21 Nov 2026), Revision 03.

**Status: provisional. Not applied to `data/` or `src/`. The live and staging ADTF page stays the
9-day Kabul–Herat–Bamyan route until the owner approves this schedule.** It lives in its own commit
so it can be dropped from the PR (`git revert <commit>`) without touching Revisions 01, 02, 04, 05.

Proposed: 11 days / 10 nights, Kabul → Ghazni → Kandahar → Kabul → Bamyan → Band-e-Amir → Kabul,
private 4WD throughout, no domestic flights. Slug `afghanistan-discovery-tour-fall` and code ADTF kept.

| File | Purpose |
|---|---|
| `tour_itinerary.ADTF.csv` | 11 replacement rows for `data/tour_itinerary.csv` (old 9 rows removed on apply, no duplicate days) |
| `tour_attractions_map.ADTF.csv` | replacement attraction links |
| `proposed-changes.json` | tours.csv / catalog fields, departure impact, cross-links, images dropping out |
| `afghanistan-discovery-tour-fall.md` | replacement page copy |
| `apply-draft.py` | applies the draft to a working tree (local preview, or promotion after approval) |

Open questions before approval: Ghazni and Kandahar hotels and overnight availability; feasibility of
the Day 3, 4 and 6 road days; what happens to the existing 9-day ADTF departures; re-costing of the
$1,950 reference price; whether the public title becomes "Autumn".
