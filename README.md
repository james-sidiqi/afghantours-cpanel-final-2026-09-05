# AfghanTours cPanel site (Astro 4)

Static marketing site for [afghantours.com](https://afghantours.com), built with Astro and shipped as tracked `dist/` for cPanel upload.

**This repository is the cPanel shipping tree.** Do not overwrite the separate Copiloted repo. Do not deploy from agent automation unless James explicitly requests production upload.

## Quick start

```bash
npm ci
npm run build          # writes dist/ + sitemap
npm run preview        # optional local preview of dist
```

Use Node 20 (`.nvmrc`). PHP CLI is required for the full booking/inquiry test suite. Server-managed PHP and booking data are excluded from static release ZIPs.

Current publishing process: [release runbook](docs/RELEASE-RUNBOOK.md), [Grokbot hosting prompt](docs/GROKBOT-HANDOFF.md), and [simple future content workflow](docs/CONTENT-CHANGE-WORKFLOW.md). The broken cPanel Git-button process is retired. Stage a verified release on cPanel, review it, then approve promotion of the exact same ZIP.

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
- Safety: inherent risk / route-aware planning language only — do **not** use “Your safety is planned, not promised.”
