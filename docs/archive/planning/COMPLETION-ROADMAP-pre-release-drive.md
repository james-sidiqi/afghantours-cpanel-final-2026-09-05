# Completion roadmap (planning only)

Lightweight planning summary for post-integration phases. **Not implemented by this PR.**

| Phase | Theme | Intent |
|------:|-------|--------|
| 1 | Product taxonomy lock | Tours / specialist / return / custom / activities / culinary / cultural remain separate |
| 2 | Inquiry unification | Single PHP handler + contact/modal context (done in consolidation PR) |
| 3 | Canonical internal links | Legacy `/tours/{retired}/` → canonical paths; keep 301s |
| 4 | Hub index SoT | `/hubs/` from relationship data (done in consolidation PR) |
| 5 | Data SoT cleanup | Act on audit classifications with James approval before deletes |
| 6 | Image/resolver hardening | Continue audits; no invented photography claims |
| 7 | Content accuracy pass | Provinces, attractions, safety language — operator review |
| 8 | FAQ / policy consolidation | Single FAQ SoT |
| 9 | Pricing & commercial rules | Only publish prices James approves |
| 10 | Map / transport QA | Route matrix vs public copy |
| 11 | Accessibility & UX polish | Forms, focus, mobile hubs UI |
| 12 | Repo hygiene / CI | Separate chore branch later — not created yet |
| 13 | Staging verify | Crawl + form dry-runs on staging host |
| 14 | Production deploy | Only after James merge review + staging sign-off |

Do **not** create `chore/repo-hygiene-ci` until James asks.
