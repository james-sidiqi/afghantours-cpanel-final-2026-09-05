# Office handoff — non-image repairs

Repository: `james-sidiqi/afghantours-cpanel-final-2026-09-05`

Branch: `fix/non-image-office-handoff-20261101`

Baseline: `main` at `f12d5257e8730f51ba8dd77bda2f15494aa71930`

Date: 1 November 2026, Kabul

This is the current non-image work list. The separate Copiloted repository and its PR numbers are not the shipping source. No production or staging upload is part of this work. The MacBook's attraction images remain a separate import.

## Start here from the office

1. Open this branch/PR on GitHub. You can review it and fill the venue worksheet in the browser without your MacBook.
2. For venue/address decisions edit **[data/venue_details.csv](../data/venue_details.csv)**. The table below explains exactly what to enter. Leave unknown details blank/pending.
3. Review the remaining business/content decisions below. Prices, operating minimums and departures have not been reset.
4. When you have the MacBook, use the read-only image comparison below before any import. Do not pull over uncommitted image work, reset/clean the old checkout, or bulk replace image folders.
5. After image integration and current CI pass, follow **[RELEASE-RUNBOOK.md](RELEASE-RUNBOOK.md)** for isolated staging and approval of the exact release. There is no need to use cPanel's Git deployment buttons.

## Completed in this branch

- Incorporates the text/data work from cPanel PR #46, then completes the missing retirement steps. Kabul Kabob, Herat Kabob and Kandahari Rosh standalone food documents are archived. Afghan Kabob and Rosh remain nationwide notes on Food & Culture; Qabeli Palaw retains its canonical detail page.
- Removes generic Bamyan Kabob, Kandahari Rosh and Ghazni Palaw from the culinary catalog, relationship rows and active content. Old URLs redirect to the consolidated food section or Qabeli Palaw. Named culinary venues remain separate experiences.
- Adds the requested potato, eggplant, pumpkin, spinach, chickpea, Dopiaza and Ouzi notes. Vegan wording requires advance confirmation of oils, dairy and stock.
- Suppresses the rejected watermelon imagery through shared resolvers and gallery discovery while retaining every original image file.
- Unpublishes Buddhist Cave Monasteries and Tomb of Nader Khan, archives their prose, and removes their tour-attraction associations. Existing itinerary days and alternative stops remain. Hadda and Bashgal are already absent as standalone active attractions; the existing Bashgal alias still leads to Nuristan River Valleys & Villages.
- Regenerates the map JSON from current CSV data before every build so retired attractions disappear from the interactive map as well as the page directory.
- Preserves the newer cPanel inquiry architecture; adds compatibility with old specialist/return camelCase URLs. Culinary, cultural and food CTAs now carry canonical flow, slug and name (plus the culinary code).
- Removes the public default dry-run key and checks the peer as well as Host for local QA. This is a repository backend fix; live PHP must be compared/backed up and approved separately before replacement.
- Makes unconfigured management return a clean 503 before session initialization, and rejects specialist/category-D departure creation before reading tour-only fields. The existing integration tests exposed both failures with PHP warnings enabled.
- Adds one address worksheet, read-only image comparison, retired-route audits and mocked browser/PHP regressions. Generated `dist/` is rebuilt from source.
- Hides the contact form's anti-spam field correctly; it previously appeared as an unlabeled blank input. The field remains submitted for the existing spam check.

## Venue addresses: one file to fill

Open **[data/venue_details.csv](../data/venue_details.csv)**. It contains nine rows. Pending rows have **no effect** on published venue names or addresses.

| Column | Your entry |
|---|---|
| `experience_slug` | Keep the existing key unchanged. |
| `venue_name` | Exact current name you permit us to publish; use the actual stop/market name where appropriate. |
| `address` | Verified street/locality or precise visitor meeting location. Do not enter a guessed address. |
| `verification_status` | Keep `pending` until checked; then use `operator-confirmed`. |
| `verified_on` | Date you actually checked, in `YYYY-MM-DD` format. |
| `confirmation_notes` | Brief basis, e.g. checked directly with the operator. Do not include private phone numbers or credentials. |

For a confirmed row all four detail/date/note fields must be filled. Confirmed details are shown on the culinary page after rebuilding; incomplete/pending rows are not published. Quotes and commas must follow normal CSV quoting. The existing office address is already consistent across contact/footer/structured data and legal documents; this worksheet does not change legal text.

Check after editing:

```bash
npm run owner:venues
npm run build
npm run audit:retired
```

The two unnamed restaurant/roadside experiences needing a venue choice are **Traditional Chainaki in Kabul** and **Kunar Trout**. Named venues still need precise addresses. Chashma-e-Dogh and the Band-e-Amir dairy market need a real stop/meeting location, not an invented restaurant.

## Remaining owner and hosting decisions

| Item | Exact source / next action |
|---|---|
| Final attraction images | Your MacBook's standardized archive / edited files. Import only after comparing; all repository image bytes are preserved by this branch. |
| Balkh / Wakhan / Wardak imagery | Review final approved photographs. cPanel PR #40 is an image-dependent change and remains separate; it is not folded into this non-image branch. |
| Return Journey duplicate image deletion | cPanel PR #47 is image-only work. Leave it separate until final image review. No binaries are deleted here. |
| Cultural hub assignments | `data/cultural_experience_hub_review.csv`: eight rows still say `NEEDS JAMES REVIEW`. Confirm real access/hubs before changing `data/cultural_experience_hubs.csv`. Eid remains unpublished. |
| Inactive expedition variants | Wakhan and the additional Minaret-of-Jam variant remain inactive pending your decision. Do not enable them accidentally during image import. |
| Shor Chai photography | Its index card remains image-free; the detail's existing landscape context is not a verified cup-of-tea photo. Supply an approved image if you want one. |
| Baghlan | The province/card are active; `is_featured=0` only excludes it from featured selections. Its existing image decodes correctly. Browser QA checks the card and popup image; review a replacement photograph only if you still want a different image. |
| Contact/mail operations | Confirm actual receipt, acknowledgement, reply routing, reference storage, management access and cron on the real host using approved test recipients. Local mocked tests cannot prove mailbox delivery. |
| Winter Circuit, 5–16 December 2026 | Repository record `DEP-WNTC-20261205` still has an unknown traveler count. Its review date was 21 October; confirm actual live counts/operating decision in management. The site correctly treats unreconciled availability as manual contact. No traveler count is invented here. |
| Historical date discrepancies | `DEP-SUMC-20260820`: 20–28 August is 9 days, catalog 8 (expected end 27 August). `DEP-CAD-20260912`: 12–19 September is 8 days, catalog 7 (expected end 18 September). Review history rather than silently rewriting it. |
| Ended departures | Discovery Fall `DEP-ADTF-20261012` ended 20 October; Kandahar `DEP-KTDE-20261026` ended 31 October. Verify records and mark completed in live management if appropriate. Repository seed does not replace live inventory. |
| Live PHP | Review the exact `public/tour-inquiry.php` and `public/manage/index.php` diffs against the live handlers. The static release deliberately excludes PHP, private configuration and booking data. |
| Redirects | `data/retired_public_routes.json` drives static redirect pages and the marked source `.htaccess` block. Manually reconcile approved new rules with live server rules; never overwrite the whole live `.htaccess`. |
| Production | Verify backup, rollback, protected staging, exact file hashes and owner approval under the release runbook. No deployment is claimed. |

PR #46's source changes are included and extended here; after this replacement is merged, #46 can be closed as superseded. Do not merge both versions independently. The older Copiloted PRs #34–#36 do not need to be imported over this newer cPanel implementation. Payment PR #17 stays outside this release.

## MacBook image comparison — read only

Use an isolated checkout of this branch. Keep the edited MacBook checkout and archive intact. If the standardized archive is still named `AfghanTours-Standardized-Images.zip`, the comparison command is:

```bash
python3 scripts/review-attraction-import.py "$HOME/Desktop/AfghanTours-Standardized-Images.zip" --output "$HOME/Desktop/AfghanTours-Image-Review.csv"
```

The tool also accepts an extracted folder. It reports `SAME`, `REPLACE`, `ADD` or `UNMAPPED`, with existing/incoming SHA-256 hashes and an inactive-attraction warning. It never extracts a ZIP, changes image files, removes existing galleries or republishes inactive attractions. Output uses exclusive creation so an existing review CSV is not overwritten.

Review the manifest and only then create a separate image branch from the approved non-image result. Match final asset references, rebuild, run the complete QA gate and review the generated site. New gallery naming does not authorize deleting unmatched existing files.

## Verification record

The current PR/checks are the final CI evidence. Local results and image-preservation counts are recorded in `docs/NON-IMAGE-QA-2026-11-01.md`. A passing build/CI is repository evidence, not proof of cPanel installation or email delivery.
