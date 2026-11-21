# Hub experience showcase — 19 November 2026

The interactive `/hubs/` cards now show Hotels, Culinary Experiences, Activities, and Cultural Experiences, with category-specific line icons instead of numbered badges.

Each selection uses the existing hub linkage tables. Culinary cards link to real culinary pages and use their approved hero/card images. Cultural cards are limited to published cultural Markdown pages and use those pages' image metadata. Activities list only linked activities, never substitute generic tours. Hubs without confirmed linked entries show an accurate empty state.

Mazar-e-Sharif examples: Mansoor Kabob, Buzkashi, and Ancient City of Balkh. Photo and navigation regression checks are in `scripts/browser-test/hub-experience-showcase.spec.mjs`.

This change builds on the consolidated staging candidate in PR #58. The previous staging ZIP predates this revision. Do not deploy it expecting these hub changes. A new release must preserve staging .htaccess, PHP, booking/manage, and robots/noindex protection.
