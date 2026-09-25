# Data Source-of-Truth Audit (cPanel repo)

Classification key:

| Label | Meaning |
|-------|---------|
| USED AT RUNTIME | Read during Astro page generation / client UX from build outputs |
| USED ONLY FOR BUILD | Consumed by build/scripts to produce pages or assets |
| MIGRATION/LEGACY | Kept for redirects, ancestry, or historical migration — do not delete without James review |
| REPORT/AUDIT ONLY | Audit scripts, reports, inventories |
| UNUSED CANDIDATE | Appears unused by current build paths — review before delete |
| UNKNOWN — REVIEW | Needs James / eng confirmation |

**Policy:** Do NOT delete files from this audit alone.

## Primary product catalogs

| Source | Classification | Notes |
|--------|----------------|-------|
| `data/tours.csv` | USED AT RUNTIME | Canonical tour packages via `getTours()` |
| `data/tours_featured.csv` | UNUSED CANDIDATE | Slim image/index mirror; runtime uses `tours.csv` |
| `data/tours_custom.csv` | UNUSED CANDIDATE / MIGRATION/LEGACY | Empty shell post specialist/custom separation |
| `data/specialist_services.csv` | USED AT RUNTIME | `/specialist-services/` |
| `data/return_journeys.csv` | USED AT RUNTIME | `/return-journeys/` |
| `data/custom_journeys.csv` | USED AT RUNTIME | `/custom-requests/` (Build My Journey) |
| `data/activities.csv` + `data/activity_hubs.csv` | USED AT RUNTIME | Activities + hub matrix |
| `data/culinary_experiences.csv` + `data/culinary_experience_hubs.csv` | USED AT RUNTIME | Culinary experiences |
| `data/cultural_experience_hubs.csv` + `data/cultural_experience_tours.csv` | USED AT RUNTIME | Cultural↔hub / tour links |
| `data/cultural_experience_hub_review.csv` | REPORT/AUDIT ONLY / UNKNOWN — REVIEW | Review worksheet; not imported by `experiences.ts` |

## Locations & hubs

| Source | Classification | Notes |
|--------|----------------|-------|
| `data/locations.csv` | USED AT RUNTIME | Hub/province/destination rows; `getHubs()` merges with markdown |
| `src/content/hubs/*.md` | USED AT RUNTIME | Editorial hub copy merged into hub pages / index catalog |
| `data/hub_at_a_glance.csv` | USED AT RUNTIME | Hub index stats / airport / season (`hubCatalog.ts`) |
| `src/components/HubsSection.astro` | USED AT RUNTIME | UI only — catalog now from `buildHubIndexCatalog()` (no hard-coded SoT) |
| `data/hub_to_attraction_access.csv` | USED AT RUNTIME / UNKNOWN — REVIEW | Access classification support |
| `data/provinces.csv` + `src/content/provinces/*.md` | USED AT RUNTIME | Province pages; `related_tour_slugs` may still hold legacy slugs as metadata |
| `data/regions.csv` + `src/content/regions/*.md` | USED AT RUNTIME | Region pages |

## Attractions, hotels, food

| Source | Classification | Notes |
|--------|----------------|-------|
| `data/attractions_master.csv` + `src/content/attractions/*.md` | USED AT RUNTIME | Attractions |
| `data/attraction_access_classification.csv` / `attraction_time_profile.csv` | USED AT RUNTIME / USED ONLY FOR BUILD | Enrichment |
| `data/hotel_properties.csv` + `hotel_rooms.csv` | USED AT RUNTIME | Hotels |
| `data/dishes.csv` + `src/content/food/**` | USED AT RUNTIME | Food-culture pages |
| Astro `restaurants` collection (if present) | USED AT RUNTIME / MIGRATION/LEGACY | Retained; culinary catalog is primary public culinary SoT |
| Culinary Experiences vs restaurant collection | USED AT RUNTIME | Culinary = experience product; restaurants = venue collection / redirects |

## FAQs & site copy

| Source | Classification | Notes |
|--------|----------------|-------|
| `data/faq.csv` | USED AT RUNTIME / UNKNOWN — REVIEW | Confirm whether FAQ page reads CSV or hard-coded sections in `[slug].astro` |
| `data/faqs/` / `faqs_master` (if present) | UNKNOWN — REVIEW | Inventory for consolidation |
| `src/content/pages/*.md` | MIXED | Some superseded by dedicated `.astro` pages (`about.astro` vs `about.md`) |
| `src/pages/about.astro` | USED AT RUNTIME | Authoritative About / Leadership / Team |
| `src/content/pages/about.md` | MIGRATION/LEGACY / UNUSED CANDIDATE | Keep until confirmed unused |
| `src/content/site/contact.md` | UNUSED CANDIDATE / MIGRATION/LEGACY | Contact UI lives in `[slug].astro` |

## Itinerary & commercial support

| Source | Classification | Notes |
|--------|----------------|-------|
| `data/tour_itinerary.csv` | USED AT RUNTIME | Day plans |
| `data/tour_attractions_map.csv` / `tour_activity_map.csv` / `tour_culinary_map.csv` | USED AT RUNTIME | Relationships |
| `data/tour_dates.csv` / `tour_inclusions.csv` | USED AT RUNTIME | Dates / inclusions |
| `data/pricing_reference.csv` | REPORT/AUDIT ONLY / UNKNOWN — REVIEW | Do not invent public prices from this without James approval |
| `data/page_assets.csv` | USED ONLY FOR BUILD / USED AT RUNTIME | Page asset mapping |

## Transport & logistics data

| Source | Classification | Notes |
|--------|----------------|-------|
| `data/airlines.csv` / `airports.csv` / `domestic_flights.csv` / `ground_transport.csv` / `route_*.csv` | USED AT RUNTIME / USED ONLY FOR BUILD | Transportation pages / map support |
| `public/data/maps/*.json` | USED AT RUNTIME | Map widgets |

## Inquiry / contact

| Source | Classification | Notes |
|--------|----------------|-------|
| `public/tour-inquiry.php` | USED AT RUNTIME | Unified inquiry handler (tour/activity/specialist/return/custom/general) |
| `src/components/TourInquiryModal.astro` | USED AT RUNTIME | Tour modal → PHP |
| Contact form in `src/pages/[slug].astro` | USED AT RUNTIME | POST → PHP (not mailto primary) |

## Scripts & audits

| Source | Classification | Notes |
|--------|----------------|-------|
| `scripts/site_integrity_audit.py` | REPORT/AUDIT ONLY | Strict integrity |
| `scripts/audit-*.mjs` / `audit-tour-sales-funnel.py` | REPORT/AUDIT ONLY | Content/image/funnel audits |
| `scripts/generate-sitemap.mjs` | USED ONLY FOR BUILD | postbuild |
| `scripts/migrate-*.mjs` | MIGRATION/LEGACY | One-off asset migrations |
| `*.before-*` / `*.backup*` under `src/` | MIGRATION/LEGACY | Do not treat as SoT |

## Dist policy

| Source | Classification | Notes |
|--------|----------------|-------|
| `dist/` | USED AT RUNTIME (cPanel) | Generated only via `npm run build`; force-tracked for cPanel deploy; **never hand-edit** |
| `.gitignore` lists `dist/` | intentional | Tracking uses force-add; do not untrack |

## Open James decisions (from this audit)

1. Confirm delete-or-keep for `tours_featured.csv` / empty `tours_custom.csv`.
2. Confirm FAQ SoT (`faq.csv` vs hard-coded `[slug].astro` sections vs `data/faqs*`).
3. Confirm whether `about.md` / `contact.md` can move to archive.
4. Confirm public use of `pricing_reference.csv`.
5. Confirm restaurant collection long-term vs culinary-only public IA.
