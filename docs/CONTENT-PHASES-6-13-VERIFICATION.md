# Content phases 6–13 — verification (2026-09-25)

Prior integration (PR #3) already shipped most of these locks. This note records verification; no invented business facts.

| Phase | Theme | Status | Evidence |
|------:|-------|--------|----------|
| 6 | Hubs / geography | PASS | 8 runtime hubs in `dist/hubs/`; glance CSV aligned; Ghazni present; `mazar-e-sharif-city` alias maps to `mazar-e-sharif` |
| 7 | Attractions | PASS | Active attractions build; itinerary popups use existing data; no invented access claims in this pass |
| 8 | Experiences | PASS | Hub matrix locked in `activity_hubs.csv`; activity≠tour enforced in catalog matrix + CTAs |
| 9 | Food / culture | PASS | Culinary catalog (11) + dish pages; restaurants redirect to culinary |
| 10 | Hotels / transport | PASS | Hotel/room heroes present after asset integrity; transport gallery paths remapped |
| 11 | Journey builder | PASS | `/custom-requests/` + homepage `CustomTours` → canonical families; `CustomJourneys` rewritten off retired URLs |
| 12 | About | PASS | Leadership James+Edrees only; American-led tagline; Our Team gallery without invented bios |
| 13 | Trust / legal | PASS | Safety line locked; FAQ SoT **not** consolidated (deferred — see NEEDS-JAMES-DECISIONS); privacy/terms pages present |

## Deferred James items
- FAQ single SoT (`faq.csv` vs hard-coded contact/FAQ sections)
- Whether to delete empty `tours_custom.csv` / archive `about.md` / `contact.md`
