# Canonical catalog matrix

Last updated: 2026-09-25 (Phase 4)

## Policy
- **Do not invent** prices, dates, venues, safety, or visa facts.
- **Do not silently flip** `is_active` when ambiguous — document instead.
- **Activity ≠ tour.** Activities are hub-arranged day options; tours are itinerary packages.
- Specialist / return / custom are **not** tour packages.

## Tours (`data/tours.csv`)

| Code | Slug | product_class | is_active | Notes |
|------|------|---------------|-----------|-------|
| CAD | `central-afghanistan-discovery` | private-fixed | 1 |  |
| ADTS | `afghanistan-discovery-tour-spring` | private-fixed | 1 |  |
| ADTF | `afghanistan-discovery-tour-fall` | private-fixed | 1 |  |
| BSKI | `bamyan-skiing-tour` | private-fixed | 1 |  |
| BUZE | `buzkashi-expedition` | scheduled | 1 |  |
| KBLS | `kabul-surroundings` | private-fixed | 1 |  |
| WKND | `weekend-in-kabul` | scheduled | 1 |  |
| WNTC | `winter-circuit` | scheduled | 1 |  |
| SUMC | `summer-circuit` | scheduled | 1 |  |
| TSRA | `treasures-of-silk-road-afghanistan` | private-fixed | 1 |  |
| TGHT | `timurid-grandeur-herat-tour` | private-fixed | 1 |  |
| TGHT-EXT | `timurid-grandeur-herat-tour-add-minaret-e-jam` | private-fixed | 0 | Inactive add-on variant; keep until James decides |
| TTWC | `trek-the-wakhan-corridor` | private-fixed | 0 | Inactive; keep until James decides |
| PVEH | `panjshir-valley-emeralds-history` | private-fixed | 1 |  |
| KTDE | `kandahar-durrani-empire-tour` | private-fixed | 1 |  |

### Scheduled (active)

- `buzkashi-expedition` (BUZE)
- `weekend-in-kabul` (WKND)
- `winter-circuit` (WNTC)
- `summer-circuit` (SUMC)

### Private-fixed (active)

- `central-afghanistan-discovery` (CAD)
- `afghanistan-discovery-tour-spring` (ADTS)
- `afghanistan-discovery-tour-fall` (ADTF)
- `bamyan-skiing-tour` (BSKI)
- `kabul-surroundings` (KBLS)
- `treasures-of-silk-road-afghanistan` (TSRA)
- `timurid-grandeur-herat-tour` (TGHT)
- `panjshir-valley-emeralds-history` (PVEH)
- `kandahar-durrani-empire-tour` (KTDE)

### Inactive (preserved — no silent reactivation)

- `timurid-grandeur-herat-tour-add-minaret-e-jam` (TGHT-EXT) — `is_active=0`
- `trek-the-wakhan-corridor` (TTWC) — `is_active=0`

## Activities (`data/activities.csv`) — not tours

| Code | Slug | is_active | Hub links (active) |
|------|------|-----------|--------------------|
| ACT-HIK | `hiking` | 1 | 8 hubs |
| ACT-FSH | `fishing` | 1 | 5 hubs |
| ACT-TRK | `trekking` | 1 | 1 hubs |
| ACT-SKI | `skiing` | 1 | 2 hubs |
| ACT-SHP | `shopping` | 1 | 8 hubs |
| ACT-SGT | `sightseeing` | 1 | 8 hubs |
| ACT-HRS | `horse-riding` | 1 | 2 hubs |
| ACT-CYC | `cycling` | 1 | 1 hubs |

## Tour ↔ activity map (`data/tour_activity_map.csv`)

Schema: `tour_code,tour_slug,activity_slug,relationship,status,day_number,note,is_active,evidence_source`

| Tour | Activity | Status | relationship |
|------|----------|--------|--------------|
| `bamyan-skiing-tour` (BSKI) | `skiing` | included | tour-includes-activity |
| `bamyan-skiing-tour` (BSKI) | `skiing` | optional | tour-includes-activity |
| `trek-the-wakhan-corridor` (TTWC) | `trekking` | included | tour-includes-activity |

## Specialist services

- `photography-documentary` (PHOT) active=1
- `scientific-research` (SCIE) active=1
- `media-journalist` (MEDIA) active=1
- `business-investment` (BIZZ) active=1
- `noshaq-expedition-support` (NOSHAQ) active=1
- `ski-expeditions` (SKI) active=1

## Return journeys

- `diaspora` (DIAS) active=1
- `veterans-contractors-diplomats` (VETS) active=1

## Custom

- `custom-expedition` (CTME) active=1

## Culinary experiences (11)

- `adam-khan-chapli-kabob` active=1
- `kunar-trout` active=1
- `kandahari-rosh` active=1
- `chashma-e-dogh` active=1
- `kabul-chainaki` active=1
- `aziz-bakery` active=1
- `bamyan-kabob` active=1
- `band-e-amir-quroot-dairy` active=1
- `arg-restaurant-herat` active=1
- `ghazni-palaw` active=1
- `mansoor-kabob` active=1

## Ambiguous / James decisions (no flips in this phase)
- `trek-the-wakhan-corridor` remains inactive
- `timurid-grandeur-herat-tour-add-minaret-e-jam` remains inactive
- Empty `data/tours_custom.csv` kept as migration shell (see SoT audit)
- FAQ SoT consolidation deferred to trust/FAQ phase

## Schema notes (Phase 4)
- `page_assets.csv` converted from semicolon-delimited to proper CSV
- `tour_activity_map.csv` gained `tour_slug` + `relationship=tour-includes-activity` (activity≠tour)
- `tours_featured.csv` remains featured-selection SoT for homepage; content SoT is `tours.csv`
