# AfghanTours Editorial + Visual System Audit

Status: active implementation audit  
Scope: cPanel source, current James mobile-review branch  
Direction: high-end editorial travel operator; confident, locally knowledgeable, straightforward, hospitable.

## Locked visual direction

Keep the existing identity:
- Display: Georgia / Times fallback
- Body: system sans
- Primary ink: `#101820`
- Primary gold: `#d6a23a`
- Gold text: `#9a6517`
- Paper: `#fbf6ed`
- Sand: `#efe8dc`
- White: `#ffffff`
- Dark footer/header family: `#06110d`

Photography and Afghanistan should carry the visual weight. UI treatment should be quieter than the imagery.

## Typography hierarchy

Use one hierarchy across public pages:
1. Gold uppercase kicker: `--text-kicker`, strong weight, restrained tracking.
2. Editorial display heading: `--font-display`.
3. Sans-serif lead: `--font-body`, `--text-lead`.
4. Body copy: `--font-body`, `--text-body`, `--line-body`.
5. Metadata: small sans; use pills only when they communicate structured information.

Avoid page-local declarations of Georgia when `var(--font-display)` is available. Avoid arbitrary heading clamps unless a component genuinely requires a different scale.

## Color discipline

New work must use `tokens.css`. Do not introduce new near-duplicate cream/gold/brown values.

Existing variants to migrate during component work include:
- `#dda52f`, `#e0a62d`, `#d6a548` -> canonical gold family
- `#b46b00`, `#b45309`, `#a86a12`, `#b98237` -> canonical gold-text/accent family after contrast check
- `#f7efe2`, `#f7f4ee`, `#fffaf0`, `#fffaf2`, `#f1eadc` -> paper/sand family
- page-local gray body colors -> `--at-text` / `--at-muted`

Do not perform blind global search/replace: verify contrast and component intent.

## Voice

Public copy should sound like an experienced Kabul-based travel operator speaking to a traveler.

Prefer:
- plain language
- specific local knowledge
- realistic expectations
- restrained confidence
- hospitality
- practical travel information

Reduce internal/corporate logistics phrasing on discovery and sales surfaces.

Examples already found:
- “rapid ground-support validation” -> ordinary customer contact language
- “Operational Travel Platform” -> traveler-facing description of how AfghanTours plans journeys
- repetitive “operational / coordination / access / route requirements” language -> retain only where it adds useful traveler information

Safety, visa, specialist-service and logistics pages may be more operational when precision is necessary.

## Current implementation findings

### Header / navigation
- Remove “Regional Map” from Explore.
- Consume canonical gold/font tokens rather than hard-coded variants.
- Mobile header is too tall: brand + full-width Contact + wrapped nav creates excessive vertical chrome. Redesign after content QA so the primary navigation remains clear without dominating the first viewport.
- Keep tagline only with site brand.

### Global CSS
- `editorial.css` is explicitly transitional and currently uses multiple `!important` compatibility overrides.
- Do not add another override layer.
- As components are normalized, delete obsolete compatibility rules.
- Final styling should come from tokens + component styles.

### Cards
Current card families use different:
- border radii
- shadows
- image heights/aspect ratios
- kicker colors
- body colors
- CTA treatments

Converge on a small set:
1. editorial image card
2. product/tour card
3. information card
4. metadata pill
5. primary/secondary CTA

Do not make every section a rounded floating card.

### Section rhythm
Use paper/sand/white/dark sections deliberately. Avoid changing background shade merely to distinguish every adjacent component. Increase whitespace before adding boxes, borders or shadows.

### Photography
- Standardize image aspect ratios within each grid.
- Preserve natural, authentic Afghanistan imagery.
- Do not use a one-off caption treatment unless it is adopted as a reusable component.
- Entity heroes must remain entity-specific.

## Content audit priorities

P0 — customer-facing identity:
- homepage
- header/footer
- About / Leadership
- tours index + tour detail
- inquiry/contact

P1 — discovery:
- hubs
- attractions
- cultural
- culinary
- activities
- food & culture
- regions/provinces

P1 — trust/practical:
- safety
- visa
- FAQ
- transportation
- hotels

P2 — specialist/return/supporting pages:
- specialist services
- return journeys
- supporting editorial pages

## Implementation rule

Do not redesign unrelated content while normalizing a component.

For every component/page touched:
1. replace local font declarations with tokens where possible
2. replace near-duplicate brand colors with tokens where appropriate
3. normalize spacing/radius/shadow to shared values
4. simplify copy that sounds internal or corporate
5. check desktop + mobile
6. preserve factual data and product classification
7. rebuild generated `dist/`; never hand-edit it

## Completion definition

The visual/editorial pass is complete when:
- major public pages visibly belong to one system
- no new arbitrary brand colors are introduced
- display/body typography is token-driven
- card types are limited and consistent
- buttons/CTAs are consistent
- mobile header does not dominate the viewport
- customer copy is traveler-facing
- operational language appears only where useful
- transitional CSS is materially smaller
- build, image, inquiry, integrity and dist-drift CI remain green
