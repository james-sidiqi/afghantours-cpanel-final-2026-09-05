# AfghanTours Tour Page Redesign — 2 Sep 2026

This patch replaces `src/pages/tours/[slug].astro`.

## What changed
- Compact breadcrumb and editorial split hero inspired by the supplied tour-page reference.
- Large lead image + three-image route preview collage.
- Tour title, duration, group size, activity level, primary planning CTA above the fold.
- Sticky section navigation: Overview, Itinerary, Accommodation, Experiences, Know before you go.
- Dense two-column desktop layout with a sticky planning/inquiry card.
- Existing tour dates are displayed without inventing availability.
- Existing `price_from` is displayed as a starting price when numeric; otherwise “Price on request.”
- Global and tour-specific inclusions are combined from `tour_inclusions.csv`.
- Day-by-day itinerary uses compact accordions.
- Route-linked hotels, attractions, food/culture, transport, and related tours remain connected to existing data.
- Responsive mobile layout included.

## Important
The change is data-driven and affects every `/tours/[slug]/` page through the shared Astro template. It does not add online checkout or claim live availability.

## Verification note
A full `astro build` could not be completed in the isolated environment because npm dependencies were not available locally and external npm registry access failed. The patch therefore needs one local `npm run build` in your normal project workspace before deployment.
