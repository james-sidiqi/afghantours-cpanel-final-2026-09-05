# AfghanTours cPanel site (Astro 4)

Static marketing site for [afghantours.com](https://afghantours.com), built with Astro and shipped as tracked `dist/` for cPanel upload.

**This repository is the cPanel shipping tree.** Do not overwrite the separate Copiloted repo. Do not deploy from agent automation unless James explicitly requests production upload.

## Quick start

```bash
npm ci
npm run build          # writes dist/ + sitemap
npm run preview        # optional local preview of dist
```

Node 20+ recommended. PHP is required only for `public/tour-inquiry.php` (copied into `dist/` on build).

## Product IA (canonical)

| Product | Route | Inquiry flow |
|---------|-------|--------------|
| Scheduled / private-fixed tours | `/tours/{slug}/` | `scheduled` / `private-fixed` |
| Activities | `/activities/{slug}/` | `activity` |
| Culinary experiences | `/cultural-experiences/culinary/{slug}/` | culinary/general as linked |
| Specialist services | `/specialist-services/{slug}/` | `specialist` |
| Return journeys | `/return-journeys/{slug}/` | `return` |
| Build My Journey | `/custom-requests/` | `custom` |
| Hubs | `/hubs/{slug}/` | hub prefill → general |

Retired `/tours/{legacy-specialist-or-custom}/` URLs 301 via `public/.htaccess` — do not use them in new links (`AGENT-RULES.md`).

## QA gate (required before merge)

```bash
npm ci
npm run build
php -l public/tour-inquiry.php
python3 scripts/site_integrity_audit.py . --strict
node scripts/audit-content-slugs.mjs
node scripts/audit-images.mjs
python3 scripts/audit-tour-sales-funnel.py
node scripts/audit-inquiry-entrypoints.mjs
```

CI runs the same checks and fails if tracked `dist/` drifts from a fresh build.

## Key docs

| Doc | Purpose |
|-----|---------|
| `AGENT-RULES.md` | Short agent/content locks |
| `CONTENT-GUIDELINES.md` | Full editorial rules |
| `CONTRIBUTING.md` | Design-system / PR expectations |
| `docs/COMPLETION-STATUS.md` | Release-drive phase status |
| `docs/DATA-SOURCE-OF-TRUTH-AUDIT.md` | Data file classifications |
| `docs/INQUIRY-ENTRYPOINT-QA.md` | Inquiry href → PHP proof |
| `docs/NEEDS-JAMES-*.md` | Blockers for James |
| `docs/DEVELOPMENT.md` | Local / CI notes |
| `docs/DEPLOYMENT-CPANEL.md` | Human deploy checklist (**not** automated here) |
| `docs/archive/` | Superseded audits (not SoT) |

## Brand locks

- Header: **Afghan Tours**
- Footer: **James Tourist & Travel Agency**
- Safety: **Your safety is planned, not promised.**
