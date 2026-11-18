# AfghanTours Food & Culture — Editable Source Pack

This is a **review-only copy** of the original text files from the AfghanTours repository.

- Source repository: james-sidiqi/afghantours-cpanel-final-2026-09-05
- Pinned source commit: 6857d87b8e772daa862a692024dbe06a41b7b2c4
- Prepared: 18 November 2026
- Included: 5 CSV, 84 active Markdown (.md), 6 Astro (.astro) source files, plus this README
- Images are not included. This pack does not change staging or production.

## How to edit

1. Extract the downloaded ZIP.
2. Open text files with an editor (VS Code, TextEdit in plain-text mode, or another editor that preserves UTF-8).
3. Keep the **original folder paths and filenames** when you save them.
4. Edit titles, summaries, descriptions and article-body text. Do not change the CSV column headers, code IDs, slugs, image paths, frontmatter keys, code or layout syntax unless that specific change is intended.
5. After editing, ZIP the edited folder with the original `data/` and `src/` structure and upload it to ChatGPT. Include this README if convenient.

## Which files control which text?

- `src/content/food/**/*.md` (65 files): individual food article pages (e.g. Dopiaza, almonds, pine nuts, desserts, tea, produce).
- `src/pages/food-culture/index.astro`: main Food & Culture landing page **card titles and short descriptions** are written here, not solely in Markdown or CSV.
- `src/pages/food-culture/[...slug].astro`: shared template for individual food detail pages.
- `data/dishes.csv`: structured dish/produce catalogue and short summaries; not the sole source of landing-card text.
- `data/culinary_experiences.csv` + `src/content/culinary-experiences/*.md`: culinary experience cards and long descriptions; on culinary detail pages, Markdown generally overrides duplicated descriptive CSV fields, but some venue fields are sourced from CSV.
- `data/culinary_experience_hubs.csv`: relationships to locations.
- `src/content/cultural-experiences/*.md`, `data/cultural_experience_hubs.csv`, `data/cultural_experience_tours.csv`: cultural experience articles and relationships.
- `src/pages/cultural-experiences/**/*.astro` and `src/pages/cultural-experiences/index.astro`: text hard-coded in page templates.

## Important safeguards

This package is an editing reference, **not a deployable cPanel release**. Do not upload this archive to staging or production. Preserve image paths and routes unless changes are reviewed. Inactive/archive content is intentionally excluded. GitHub `main` and the website remain unchanged.

When you return the edited ZIP, I can compare each changed file against the pinned source, check CSV formatting, preserve redirects and image mapping, and prepare a reviewed change proposal.
