# Photo provenance, attribution and product naming (PR #33, 2026-10-14)

No photo was removed, hidden or replaced for provenance reasons. Noshaq and Chicken Street stay where they are. /photo-credits/ stays unpublished (302 to /) and all credit records are kept in `src/data/photoCredits.ts`.

## 1. Provenance concerns

| Photo (path) | Where used | Concern | Recommended solution |
|---|---|---|---|
| Noshaq hero `custom-tours/noshaq-expedition-support/hero.webp` | Noshaq specialist page, cards | No credit record, no source or licence on file | James to confirm the photographer or source. If it is AfghanTours' own, add a "© AfghanTours" record. If it is third-party, get written permission or a CC source and add the credit. Keep in place meanwhile. |
| Chicken Street `attractions/chicken-street/hero.webp`, `thumb.webp` | Chicken Street, Kabul attractions, tours, hubs | The Wikimedia file is "Kabul_Antiquity_Shop2.jpg" (Casimiri, CC BY-SA 3.0). The licence is uploader-asserted, and the file does not name Chicken Street. | The credit is now visible on every page that shows it. Recommend checking the Commons file page and its upload history. Use the caption "Antique shop, Kabul" unless the location is confirmed. Proposed only, not applied. |
| Walnut `food/dried-fruit/panjshir-walnuts/fresh-walnuts-original.webp` | Walnuts card and page | No credit record; source unknown (it replaced the rejected Ivar Leidus photo). | James to confirm the origin. Add a "© AfghanTours" or third-party credit record. |
| Dried mulberries `food/produce/central-valley-mulberries/hero.webp` | Mulberries card and page | Zeynel Cebeci, CC BY-SA 4.0, photographed in **Malatya, Turkey**. The page credit shows the author and licence but does not say the photo is from Turkey. | **Proposal:** use jsp-013 `food/produce/mulberries/gallery-1.webp` (© AfghanTours) as the hero. Or keep this one and add the caption "Dried white mulberries (photographed in Malatya, Turkey)". Neither is applied. |
| Jalalabad road 01 `transport/roads/jalalabad-parun/01.webp` | Transportation | No credit record | James to confirm the source, then add a record. |
| Night cherry cart (jsp-016) | Shopping activity hero | Identifiable vendor; consent not on file | Get the vendor's verbal or written consent, or confirm the photo was taken publicly with consent. Keep in place meanwhile. |
| Guest Films (Cosmopolitan Canadian, YouTube) | Home and Guest Films | **URGENT (compliance):** credit is shown, but there's no written permission on file to embed or feature the films as guest content | Get written permission from the channel owner before deploy. |
| European roller (Glynn Morris, CC BY 4.0) `activities/birding/hero.webp` | No longer referenced (the birding hero is now the jsp-012 peacock) | The birding page **credited the peacock to Glynn Morris**, because hero_credit and hero_alt were still set from the old hero. | **Fixed:** birding.md now says "AfghanTours" with the peacock alt text. The roller file is kept. |

## 2. CC attribution check (built site)

Method: every CC BY / CC BY-SA record in `photoCredits.ts` was matched against every built page that shows its image. Before this change, 124 of 144 uses had no credit on the page (mostly card uses on tour, hub and list pages). `scripts/inject-photo-credits.mjs` now runs after `astro build`. It adds a "Photos on this page: Author (source link), Licence (link)" line above the footer of any page showing a CC image without its credit. Result: **0 uses without a credit.** Dedicated pages keep their caption credits ("Photo: author, licence").

| Author | Licence | Image |
|---|---|---|
| Abdul Qahar Nuristan | CC BY-SA 3.0 | barg-e-matal-lakes hero/thumb |
| Abdul qayoum | CC BY 3.0 | paktia-pine-nuts hero |
| Afghanistan Matters | CC BY 2.0 | istalif-pottery gallery 03 |
| Ayri8888 | CC BY-SA 4.0 | badghis-pistachios hero |
| Bim24 | CC BY 4.0 | herat-raisins hero |
| Casimiri at English Wikipedia | CC BY-SA 3.0 | chicken-street hero/thumb |
| Christopher Killalea | CC BY-SA 3.0 | istalif-pottery gallery 05 |
| Danial | CC BY-SA 4.0 | dragon-valley hero/thumb |
| Jim Kelly | CC BY 2.0 | veteran-return hero |
| Julian-G. Albert | CC BY 2.0 | balkh-melons hero |
| PAULIX04 | CC BY-SA 4.0 | farah-watermelon hero |
| Peretz Partensky | CC BY-SA 2.0 | hiking hero/thumb |
| Tigerlily143 | CC BY-SA 4.0 | istalif-pottery gallery 02 |
| WilliamEHenry | CC BY-SA 4.0 | shahr-e-gholghola hero/thumb |
| Zeynel Cebeci | CC BY-SA 4.0 | central-valley-mulberries hero |

Ken Scar (U.S. Army) and SPC Vang Seng Thao are public domain, so credit is shown but not required. The Glynn Morris roller is no longer displayed. The Guest Films credit is in GuestFilms.astro.

## 3. Product-first naming (slugs and URLs unchanged; no redirects needed)

| Old | New | Province mention kept | Source |
|---|---|---|---|
| Panjshir Walnuts | Walnuts | none (unverified) | — |
| Kandahar Grapes | Afghan Grapes | Kandahar, Kabul, Parwan | WUR edepot.wur.nl/192555; FAO AGRIS 6474809979cbb2c2c1b8fa2e |
| Wardak Apples | Fresh Apples | Maidan Wardak (leading), Ghazni, Kabul, Paktia | freshplaza.com/article/9701385; Pajhwok 2025 |
| Farah Watermelon | Watermelons | none | — |
| Jalalabad Sugarcane | Sugarcane | Nangarhar | Pajhwok 2022/2023; AVA (MAIL statistics) |
| Central Valley Mulberries / Badakhshan Mulberries | Mulberries | none | — |
| Shor Chai of Badakhshan: Tea of the High Mountains | Shor Chai | none in the card (the page body keeps the Badakhshan travel context) | — |
| Kandahar Pomegranate | Pomegranates | Kandahar | UC ANR ucanr.edu/sites/default/files/2010-06/19305.pdf; World Bank 2018 (Kandahar horticulture) |
| Herat Saffron | Saffron | Herat (>90%) | World Bank 2015 (saffron alternative to poppy); FAO |
| Balkh Almonds / Daykundi Almonds | Almonds | none | — |
| Herat Raisins | Raisins | none | — |
| Pistachios Samangan | Pistachios | Badghis, Samangan (wild forests) | FAO Afghanistan, forest rehabilitation (pistachio) |
| Bamyan Potatoes | Potatoes | none | — |
| Balkh Melon | Melons | none | — |

Review (not renamed): **Kunduz Melon**. Renaming it gives a second "Melons" card. Recommend merging it into Melons or dropping the card; James to decide. The story features ("The Gardens of Logar", "The Pine Nut Harvest of Paktia", "The Pistachio Forests of Badghis", "The Red Gold of Kandahar") keep their titles. Badghis and Kandahar are sourced; Logar and Paktia are unverified, so review them.

## 4. Regional dish names (kept; review list)

| Dish | Recommendation |
|---|---|
| Kabul Kabob | Keep: a genuine named style (Kabuli lamb tikka) |
| Herat Kabob | Review: no source found for a distinct Herati kabob. Recommend keeping it only if the kitchen describes a real local style; otherwise use "Lamb Kabob (Herat)" |
| Kandahari Rosh(t) | Keep: a recognised Kandahari/Pashtun dish (rosh) |
| Chapli Kabob | Keep (generic name; Jalalabad association widely documented) |
| Qabuli Palaw | Keep (national dish; name is not a provenance claim) |
| Shola-e-Ghorbandi | Keep: a named Ghorband dish |
| Grilled Trout by the Kunar River | Keep (place of the experience, not an exclusive claim) |
| Chicken Kabuli | Keep |
| Adam Khan Chapli Kabob stops / Qurut Markets of Bamyan / Saffron Tea Houses of Herat | Keep (place-based experiences) |

## 5. Wedding photo search (2026-10-14)

- Attachments: 4 agent folders under /home/box/agent-data/agents/*/attachments (300 files in total). No wedding-related files.
- /workspace: only the `experiences/cultural/afghan-weddings/{hero,thumb,gallery/01}.webp` copies in other worktrees. These are one image (blob 0cbed620) that James X'd in cleanup round 2 (d2272e67). Not restored.
- Git, all branches and history: afghantours-cpanel-final (47 refs) and copiloted-astro-afghantours (63 refs, plus the audit clone). The copiloted repo has four other images at `public/assets/images/cultural-experiences/afghan-weddings/{hero,gallery/01-03}.webp` (commit 332f7ad7, 2026-09-20): a wedding feast, a guest table, a hall interior and a "City Star" hall exterior. **No provenance or credit.** These are candidates only; not added.
- image-library/register.csv on every branch of both repos: no wedding rows.
- GitHub code search (user:james-sidiqi, "wedding" webp/jpg, "aroosi"): 0 results.
- Server (one read-only cPanel Fileman listing of afghantours-private): 6 backup/deploy zips (pre-8867920, pre-d76caa8, deploy-main-8867920, deploy-main-d76caa8, pre-deploy-17fc333, pre-deploy-fc06d0b). The zip contents can't be listed through the API without downloading or extracting, so they weren't inspected. They are snapshots of the deployed git trees above.

## 6. t245 approved photos (James, 2026-10-14). Register: docs/image-register-t245.csv

| File (original) | New asset | Used on | Credit |
|---|---|---|---|
| cdacf989 (matches copiloted hero, dHash 4/256) | afghan-weddings/city-star-wedding-hall-night.webp + crops/-hero, -card | Weddings hero, cultural index card, gallery | Photo: AfghanTours |
| 9bc40421 (matches copiloted gallery-03, 1/256) | afghan-weddings/wedding-hall-interior.webp | Weddings content (before "Arranging"), gallery | Photo: AfghanTours |
| 980f3005 (same scene as copiloted gallery-02, other crop) | afghan-weddings/wedding-guests-table.webp | Weddings content (before "Cultural pairing"), gallery | Photo: AfghanTours |
| 7b76fd7c basket | mulberries/mulberry-basket.webp + crops | Mulberries card + detail hero + gallery | Photo: AfghanTours |
| 7d42f716 jsp-013 (same photo as existing mulberries/gallery-1.webp) | mulberries/black-mulberries-jsp013.webp | Mulberries gallery | Photo: AfghanTours |
| acda88a2 feast table (= copiloted gallery-01) | **EXCLUDED**: appears AI-generated; pending James | none | none |

EXIF was stripped from all outputs and the originals are kept in /workspace/qc/fix-2026-10-14/originals-t245/. The Malatya dried-mulberry photo is no longer referenced (REJECTED_IMAGES); the file and its credit record are kept. The old weddings thumb.webp (a tour group in a tea house, not a wedding) is kept but no longer shown on the weddings page, which now uses a curated gallery.

## 7. Credit re-verification against Wikimedia Commons (API extmetadata, 2026-10-14)

All 24 Commons-sourced records match the file page's author and licence. Differences: DVIDS "Canal upgrades…" has a blank Artist field (public domain, credit kept) and Sahrad.jpg is "CC0" on Commons ("CC0 1.0" on site). There is no "Attribution" override text that we omit, except Casimiri ("Casimiri at the English-language Wikipedia"; the site says "Casimiri at English Wikipedia", which is equivalent). I found no evidence of unauthorized use. Licences are uploader-asserted on Commons.

## 8. Guest Films

The five films (TheCosmopolitanCanadian) play through the official youtube-nocookie.com/embed iframe after a click; no video is self-hosted. YouTube oEmbed returns 200 for all five, so embedding is enabled. **The stills are self-hosted:** /assets/images/guest-films/yt-<id>.webp match the creator's YouTube thumbnails (hash distance 0–1/144). An authorized embed doesn't need separate permission, but self-hosting the thumbnails is outside the embed. Recommend the creator's written OK, or serving the thumbnails from i.ytimg.com. Section unchanged.
