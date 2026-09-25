# Tour image identity rule (locked)

**Rule:** Each tour’s public hero/overview/thumbnail must resolve from **that tour’s own asset folder** (or an explicit CSV path under that folder). Never borrow another tour’s hero, never invent photography, never substitute unrelated destinations.

## Resolution order (`getTourHeroImage`)
1. Explicit tour fields (`hero_image` / `hero_image_path` / …)
2. `/assets/images/featured-tours/{slug}/hero.webp`
3. `/assets/images/custom-tours/{slug}/hero.webp` (legacy folder only if present)
4. Neutral placeholder (`PLACEHOLDERS.tour`)

Same-slug-only fallbacks apply to overview images.

## Phase 5 verification (2026-09-25)
- Active tours: **13**
- Missing heroes: **0**
- Heroes outside own `featured-tours/{slug}/` folder: **0**
- Byte-identical hero files shared across two active tours: **0**

Inactive tours (`trek-the-wakhan-corridor`, Minaret-e-Jam add-on) unchanged.

## Enforcement
- `scripts/audit-tour-image-identity.mjs` fails CI-local runs if the above breaks
- Activities already forbid cross-activity hero substitution (prior hub pass)
