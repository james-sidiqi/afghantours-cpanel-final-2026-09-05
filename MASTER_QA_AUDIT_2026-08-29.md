# AfghanTours.com Master QA Audit — 29 August 2026

Scope: current AfghanTours source plus the Transportation conversion rewrite, audited against the supplied master checklist.

## 1. Global Navigation & Footer Polish

- PASS — Footer address: `2nd Floor, Majid Mall, Shahr-e-Naw, District 10, Kabul, Afghanistan`.
- PASS — Operator license: `ATO-KBL-1617` displayed in footer legal line.
- PASS — WhatsApp/contact block retained and visually styled for the dark mountain footer.
- PASS — Brand motto: `Service • Integrity • Excellence`.
- PASS — Footer navigation groups: Explore, Plan, Tours, Contact & Legal.
- PASS — Responsive footer grid maintained at desktop, tablet, and mobile breakpoints.

## 2. Contact Page Layout & Contrast

- PASS — Desktop contact intro uses explicit two-column grid with protected minimum widths and larger inter-column gap.
- PASS — Intermediate desktop breakpoint added to prevent the oversized H1 from colliding with the form.
- PASS — Contact H1 maximum size reduced and balanced wrapping enabled.
- PASS — Contact background hero asset exists and overlay opacity was reduced so the image remains visible while preserving text contrast.
- PASS — All six interest pills are now real links with borders, hover/focus states, and query-string prefilling into the inquiry form.
- PASS — Google Maps button has explicit high-contrast text/background states.
- PASS — Contact-only query-string JavaScript is now scoped to the contact route instead of being shipped on every generic `[slug]` page.

## 3. Transportation Conversion Upgrade

- PASS — Benefit-first service headings.
- PASS — Action-oriented service CTAs.
- PASS — `Our Route Intelligence` reframing.
- PASS — Two-step route recommendation flow.
- PASS — Step 2 requests only Destination, Group Size, Preferred Style, and WhatsApp/Email.
- PASS — Prominent top-of-page `ATO-KBL-1617` badge.
- PASS — Vehicle/service micro-copy, including Toyota Land Cruiser/4Runner guidance.
- PASS — Six previously broken transportation card image paths replaced with verified existing assets.

## 4. SEO & EEAT Architecture

- PASS — Site-wide canonical, Open Graph, Twitter card metadata.
- PASS — Site-wide JSON-LD for `TravelAgency` + `LocalBusiness` with Kabul District 10 address, contact details, license identifier, and Afghanistan service area.
- PASS — `TouristTrip` JSON-LD added to tour detail pages with provider relationship and an ordered `ItemList` itinerary where route stops are available.
- PASS — Existing Astro architecture has no client hydration directives (`client:load`, `client:visible`, etc.). Interactive JavaScript remains limited to features that require it (maps, popups, route planner, filters).
- PASS — Shared PageHero image receives eager loading/fetch priority hints for LCP.
- PASS — Semantic page structure uses one route-specific H1 in the audited templates and H2/H3 for subordinate content.
- PASS — Local authority signals are reinforced in footer, Contact page, and structured data.

## Tailwind Version Exception

- NOT MIGRATED — Current project dependency is `tailwindcss ^3.4.17` with `@astrojs/tailwind`.
- The runtime-performance objective is still largely preserved because Tailwind is compiled CSS and the site uses Astro without client-framework hydration.
- A Tailwind 4 migration should be a dedicated dependency/visual-regression pass: remove `@astrojs/tailwind`, add Tailwind's Vite plugin, update the CSS entry point, refresh the lockfile, run a full static build, and visually QA all routes for Tailwind 4 breaking style changes.
- This migration was intentionally not forced into the production-ready source without a working dependency install/build environment.

## Validation Performed

- Astro compiler parse: 61 `.astro` files, 0 syntax errors.
- Transportation referenced image audit: 6/6 card assets exist.
- Contact hero, Transportation hero, footer mountain background, and footer logo assets exist.
- Required checklist strings and structures verified programmatically.
- Full `astro build` was not completed in this environment because a clean npm dependency install could not be completed; the source archive's historical Mac-native dependencies are not suitable for Linux build verification.
