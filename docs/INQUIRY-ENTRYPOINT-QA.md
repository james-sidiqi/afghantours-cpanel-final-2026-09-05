# Inquiry Entry-Point QA (rendered HTML → Contact parse → PHP)

Generated: 2026-09-25 (Asia/Kabul)
Repo: `afghantours-cpanel-final-2026-09-05` / branch `feat/hub-experience-architecture`

## Method
1. `npm run build` → extract real `href="/contact/?…"` from **built** HTML under `dist/` (not hand-built POSTs).
2. Simulate Contact page parse (**canonical params first**, legacy fill gaps only).
3. POST those fields to `public/tour-inquiry.php` with `dry_run=1` on localhost/CLI (no mail).
4. Assert flow, entity code/slug, classification, and subject.

## Helper
- `src/lib/inquiry.ts` → `buildTourInquiryHref(tour)` (+ activity/specialist/return/custom builders)
- Canonical params: `flow`, `entity_type`, `entity_code`, `entity_slug`, `entity_name`, `product_class`

## Results

| Product | Expected flow | Pass | Source page | PHP flow | Classification | Subject | Code |
|---------|---------------|------|-------------|----------|----------------|---------|------|
| Weekend in Kabul | scheduled | PASS | `/tours/weekend-in-kabul/index.html` | scheduled | Scheduled tour inquiry | `AfghanTours Scheduled tour inquiry: Weekend in Kabul` | WKND |
| Winter Circuit | scheduled | PASS | `/tours/winter-circuit/index.html` | scheduled | Scheduled tour inquiry | `AfghanTours Scheduled tour inquiry: Winter Circuit` | WNTC |
| Summer Circuit | scheduled | PASS | `/tours/summer-circuit/index.html` | scheduled | Scheduled tour inquiry | `AfghanTours Scheduled tour inquiry: Summer Circuit` | SUMC |
| Buzkashi Expedition | scheduled | PASS | `/tours/buzkashi-expedition/index.html` | scheduled | Scheduled tour inquiry | `AfghanTours Scheduled tour inquiry: Buzkashi Expedition` | BUZE |
| Central Afghanistan Discovery | private-fixed | PASS | `/tours/central-afghanistan-discovery/index.html` | private-fixed | Private fixed tour inquiry | `AfghanTours Private fixed tour inquiry: Central Afghanistan Discovery` | CAD |
| Bamyan Skiing Tour | private-fixed | PASS | `/tours/bamyan-skiing-tour/index.html` | private-fixed | Private fixed tour inquiry | `AfghanTours Private fixed tour inquiry: Bamyan Skiing Tour` | BSKI |
| Fishing | activity | PASS | `/activities/fishing/index.html` | activity | Activity inquiry | `AfghanTours Activity inquiry: Fishing` | ACT-FSH |
| Photography & Documentary Support | specialist | PASS | `/specialist-services/photography-documentary/index.html` | specialist | Specialist service inquiry | `AfghanTours Specialist service inquiry: Photography & Documentary Support` | PHOT |
| Diaspora Return | return | PASS | `/return-journeys/diaspora/index.html` | return | Return journey inquiry | `AfghanTours Return journey inquiry: Diaspora & Heritage Return` | DIAS |
| Build My Journey | custom | PASS | `/custom-requests/index.html` | custom | Custom journey / Build My Journey inquiry | `AfghanTours Custom journey / Build My Journey inquiry: Build My Journey` | CTME |

**Overall: ALL PASS** (10/10)

## Per-case detail
### Weekend in Kabul

- **Source page:** `/tours/weekend-in-kabul/index.html`
- **Rendered href:** `/contact/?flow=scheduled&entity_type=tour&entity_code=WKND&entity_slug=weekend-in-kabul&entity_name=Weekend+in+Kabul&product_class=scheduled`
- **Contact parse:** `{"flow": "scheduled", "entity_type": "tour", "entity_code": "WKND", "entity_slug": "weekend-in-kabul", "entity_name": "Weekend in Kabul", "product_class": "scheduled"}`
- **PHP flow:** `scheduled`
- **Classification:** Scheduled tour inquiry
- **Subject:** `AfghanTours Scheduled tour inquiry: Weekend in Kabul`
- **Entity:** `{"type": "tour", "code": "WKND", "slug": "weekend-in-kabul", "name": "Weekend in Kabul", "product_class": "scheduled"}`
- **Pass:** True

### Winter Circuit

- **Source page:** `/tours/winter-circuit/index.html`
- **Rendered href:** `/contact/?flow=scheduled&entity_type=tour&entity_code=WNTC&entity_slug=winter-circuit&entity_name=Winter+Circuit&product_class=scheduled`
- **Contact parse:** `{"flow": "scheduled", "entity_type": "tour", "entity_code": "WNTC", "entity_slug": "winter-circuit", "entity_name": "Winter Circuit", "product_class": "scheduled"}`
- **PHP flow:** `scheduled`
- **Classification:** Scheduled tour inquiry
- **Subject:** `AfghanTours Scheduled tour inquiry: Winter Circuit`
- **Entity:** `{"type": "tour", "code": "WNTC", "slug": "winter-circuit", "name": "Winter Circuit", "product_class": "scheduled"}`
- **Pass:** True

### Summer Circuit

- **Source page:** `/tours/summer-circuit/index.html`
- **Rendered href:** `/contact/?flow=scheduled&entity_type=tour&entity_code=SUMC&entity_slug=summer-circuit&entity_name=Summer+Circuit&product_class=scheduled`
- **Contact parse:** `{"flow": "scheduled", "entity_type": "tour", "entity_code": "SUMC", "entity_slug": "summer-circuit", "entity_name": "Summer Circuit", "product_class": "scheduled"}`
- **PHP flow:** `scheduled`
- **Classification:** Scheduled tour inquiry
- **Subject:** `AfghanTours Scheduled tour inquiry: Summer Circuit`
- **Entity:** `{"type": "tour", "code": "SUMC", "slug": "summer-circuit", "name": "Summer Circuit", "product_class": "scheduled"}`
- **Pass:** True

### Buzkashi Expedition

- **Source page:** `/tours/buzkashi-expedition/index.html`
- **Rendered href:** `/contact/?flow=scheduled&entity_type=tour&entity_code=BUZE&entity_slug=buzkashi-expedition&entity_name=Buzkashi+Expedition&product_class=scheduled`
- **Contact parse:** `{"flow": "scheduled", "entity_type": "tour", "entity_code": "BUZE", "entity_slug": "buzkashi-expedition", "entity_name": "Buzkashi Expedition", "product_class": "scheduled"}`
- **PHP flow:** `scheduled`
- **Classification:** Scheduled tour inquiry
- **Subject:** `AfghanTours Scheduled tour inquiry: Buzkashi Expedition`
- **Entity:** `{"type": "tour", "code": "BUZE", "slug": "buzkashi-expedition", "name": "Buzkashi Expedition", "product_class": "scheduled"}`
- **Pass:** True

### Central Afghanistan Discovery

- **Source page:** `/tours/central-afghanistan-discovery/index.html`
- **Rendered href:** `/contact/?flow=private-fixed&entity_type=tour&entity_code=CAD&entity_slug=central-afghanistan-discovery&entity_name=Central+Afghanistan+Discovery&product_class=private-fixed`
- **Contact parse:** `{"flow": "private-fixed", "entity_type": "tour", "entity_code": "CAD", "entity_slug": "central-afghanistan-discovery", "entity_name": "Central Afghanistan Discovery", "product_class": "private-fixed"}`
- **PHP flow:** `private-fixed`
- **Classification:** Private fixed tour inquiry
- **Subject:** `AfghanTours Private fixed tour inquiry: Central Afghanistan Discovery`
- **Entity:** `{"type": "tour", "code": "CAD", "slug": "central-afghanistan-discovery", "name": "Central Afghanistan Discovery", "product_class": "private-fixed"}`
- **Pass:** True

### Bamyan Skiing Tour

- **Source page:** `/tours/bamyan-skiing-tour/index.html`
- **Rendered href:** `/contact/?flow=private-fixed&entity_type=tour&entity_code=BSKI&entity_slug=bamyan-skiing-tour&entity_name=Bamyan+Skiing+Tour&product_class=private-fixed`
- **Contact parse:** `{"flow": "private-fixed", "entity_type": "tour", "entity_code": "BSKI", "entity_slug": "bamyan-skiing-tour", "entity_name": "Bamyan Skiing Tour", "product_class": "private-fixed"}`
- **PHP flow:** `private-fixed`
- **Classification:** Private fixed tour inquiry
- **Subject:** `AfghanTours Private fixed tour inquiry: Bamyan Skiing Tour`
- **Entity:** `{"type": "tour", "code": "BSKI", "slug": "bamyan-skiing-tour", "name": "Bamyan Skiing Tour", "product_class": "private-fixed"}`
- **Pass:** True

### Fishing

- **Source page:** `/activities/fishing/index.html`
- **Rendered href:** `/contact/?flow=activity&entity_type=activity&entity_code=ACT-FSH&entity_slug=fishing&entity_name=Fishing`
- **Contact parse:** `{"flow": "activity", "entity_type": "activity", "entity_code": "ACT-FSH", "entity_slug": "fishing", "entity_name": "Fishing", "product_class": ""}`
- **PHP flow:** `activity`
- **Classification:** Activity inquiry
- **Subject:** `AfghanTours Activity inquiry: Fishing`
- **Entity:** `{"type": "activity", "code": "ACT-FSH", "slug": "fishing", "name": "Fishing", "product_class": ""}`
- **Pass:** True

### Photography & Documentary Support

- **Source page:** `/specialist-services/photography-documentary/index.html`
- **Rendered href:** `/contact/?flow=specialist&entity_type=specialist&entity_code=PHOT&entity_slug=photography-documentary&entity_name=Photography+%26+Documentary+Support`
- **Contact parse:** `{"flow": "specialist", "entity_type": "specialist", "entity_code": "PHOT", "entity_slug": "photography-documentary", "entity_name": "Photography & Documentary Support", "product_class": ""}`
- **PHP flow:** `specialist`
- **Classification:** Specialist service inquiry
- **Subject:** `AfghanTours Specialist service inquiry: Photography & Documentary Support`
- **Entity:** `{"type": "specialist", "code": "PHOT", "slug": "photography-documentary", "name": "Photography & Documentary Support", "product_class": ""}`
- **Pass:** True

### Diaspora Return

- **Source page:** `/return-journeys/diaspora/index.html`
- **Rendered href:** `/contact/?flow=return&entity_type=return&entity_code=DIAS&entity_slug=diaspora&entity_name=Diaspora+%26+Heritage+Return`
- **Contact parse:** `{"flow": "return", "entity_type": "return", "entity_code": "DIAS", "entity_slug": "diaspora", "entity_name": "Diaspora & Heritage Return", "product_class": ""}`
- **PHP flow:** `return`
- **Classification:** Return journey inquiry
- **Subject:** `AfghanTours Return journey inquiry: Diaspora & Heritage Return`
- **Entity:** `{"type": "return", "code": "DIAS", "slug": "diaspora", "name": "Diaspora & Heritage Return", "product_class": ""}`
- **Pass:** True

### Build My Journey

- **Source page:** `/custom-requests/index.html`
- **Rendered href:** `/contact/?flow=custom&entity_type=custom&entity_code=CTME&entity_slug=custom-expedition&entity_name=Build+My+Journey`
- **Contact parse:** `{"flow": "custom", "entity_type": "custom", "entity_code": "CTME", "entity_slug": "custom-expedition", "entity_name": "Build My Journey", "product_class": ""}`
- **PHP flow:** `custom`
- **Classification:** Custom journey / Build My Journey inquiry
- **Subject:** `AfghanTours Custom journey / Build My Journey inquiry: Build My Journey`
- **Entity:** `{"type": "custom", "code": "CTME", "slug": "custom-expedition", "name": "Build My Journey", "product_class": ""}`
- **Pass:** True

## Guards verified
- Scheduled tours keep `flow=scheduled` / `product_class=scheduled` (not demoted to private-fixed).
- Tour codes preserved (`WKND`, `WNTC`, `SUMC`, `BUZE`, `CAD`, `BSKI`).
- Non-tour flows do not require `tour_code`.
- PHP: CR/LF stripped from fields/subject; max lengths; fixed recipient `info@afghantours.com`; email validation; honeypot; email OR WhatsApp; dry_run restricted off localhost without key.

## Notes
- Homepage FeaturedTours modal builds `inquiryHref` client-side from precomputed `tour.inquiryHref` (same helper at build time).
- Legacy `?tour=` / `?type=` remain readable by Contact parser; new links use canonical params only.
