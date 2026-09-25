# Activity facts sources (internal)

Hub matrix (`activity_hubs.csv`) is **locked** — this note only covers activity-level `best_season` / `duration` / availability wording and the tour↔activity relationship table.

| Activity | Retained / adjusted values | Source basis |
|---|---|---|
| hiking | Varies by hub and route (subject to conditions); Varies — half day to full day; discuss during planning | Locked `activity_hubs` availability notes (“when routes are open”); planning range, not a climate or trail guarantee |
| fishing | Varies by corridor (subject to conditions); Varies — typically half day to full day; discuss during planning | Locked matrix day-trip notes (“when season and access allow”) |
| trekking | Varies by season and access (subject to conditions); Varies by time/difficulty/route/access — discuss during planning | Locked Faizabad `expedition-base` row; rewritten as arrange-from-hub activity, not one packaged expedition |
| skiing | Winter–early spring when snow and access allow (subject to conditions); Varies — discuss during planning | Locked seasonal Kabul/Bamyan rows; kept separate from Bamyan Skiing Tour product |
| shopping | Year round (subject to local conditions); Varies — typically 1–3 hours; discuss during planning | `all_active_hubs` in-hub bazaar browsing — not a shop-hours claim |
| sightseeing | Year round (subject to site access); Varies — half day to full day; discuss during planning | `all_active_hubs` — site access still varies |
| horse-riding | Varies (subject to horses, handlers, and routes); Varies — typically 1–3 hours; discuss during planning | Locked near-hub rows (“when horses and handlers are available”) |
| cycling | Varies (subject to conditions); Varies — typically 1–3 hours; discuss during planning | Locked Kabul in-hub row (“when conditions allow”) |

## tour_activity_map.csv

Explicit relationships only — never inferred from shared hubs.

| tour_code | activity_slug | status | evidence |
|---|---|---|---|
| BSKI | skiing | included (day 3) / optional (day 4) | `tour_itinerary.csv` Bamyan Skiing Tour ski days |
| TTWC | trekking | included | Product identity + Faizabad-staged Wakhan/Badakhshan mountain days in itinerary |

Values that would otherwise be inferred without operator/matrix support should remain blank, “varies…”, or “discuss during planning”.
