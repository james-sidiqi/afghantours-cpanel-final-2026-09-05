# AfghanTours — Terminal audit + implementation plan

For the local repo on the MacBook: `james-sidiqi/copiloted-astro-afghantours`

Content only where possible. Do not invent tours, prices, or safety guarantees. Follow `CONTENT-GUIDELINES.md` and `AGENT-RULES.md`.

Live number stays: `+93 780 123 456` / `https://wa.me/93780123456`

---

## 0. What you are looking at

This site is Astro + CSV. Public sentences live in two places:

| Kind of copy | Where to edit |
|---|---|
| Homepage, About, Safety, Visa, Contact, Footer, Hero labels | `src/pages/*.astro`, `src/components/site/*.astro`, `src/lib/config.ts` |
| Tour names, summaries, duration, price_from, season | `data/tours.csv` |
| Day-by-day tour text | `data/tour_itinerary.csv` |
| Destination / province blurbs | `data/provinces.csv` |
| Food pages | `data/dishes.csv` |
| FAQ answers | `data/faq.csv` |
| Hotels | `data/hotel_properties.csv` |
| Tour ↔ attraction links | `data/tour_attractions_map.csv` |

Do **not** hardcode a second tour description inside an `.astro` file if the CSV already holds it. That is the repo’s own DATA.md rule.

Specialist tours that appear on the *live* site (Veteran Return, Media Support, Business Investment, Ski Expeditions, Noshaq) may be newer than the GitHub snapshot. The local audit script will tell you whether they exist in *your* `data/tours.csv`. Edit what is on disk. Do not invent the missing ones.

---

## 1. Thirty-minute Terminal check (do this first)

Open Terminal on the MacBook.

```bash
# Find the repo if you are not already in it
mdfind -name 'copiloted-astro-afghantours' 2>/dev/null | head
ls ~/Documents ~/Desktop ~/code ~/src ~/Projects ~/dev 2>/dev/null

cd /PATH/TO/copiloted-astro-afghantours

git status
git branch --show-current
git log -1 --oneline
```

Save the audit script from this package as `scripts/audit-afghantours.sh` inside the repo (or run it from Downloads). Then:

```bash
chmod +x scripts/audit-afghantours.sh
./scripts/audit-afghantours.sh .
open audit-out/audit-*.txt
```

If `rg` is installed you can also run a fast second pass:

```bash
rg -n -i 'itinerary CSV|Inquire Days|\$Inquire|highly secure|peacetime|historically safe|most trusted|safe operational|unforgettable|Westward Exploration|Highland Expedition|Custom Adventure' src data
```

Keep the report. That is the punch list.

Optional live-vs-local sanity check (does not change files):

```bash
curl -sI https://afghantours.com/provinces/ | head -5
curl -sI https://afghantours.com/regions/ | head -5
curl -sI https://afghantours.com/tours/veteran-return/ | head -5
curl -s https://afghantours.com/tours/veteran-return/ | grep -i -E 'itinerary CSV|Inquire|highly secure|peacetime' || true
```

Start the local site only after P0 edits, or now if you want to see the current local render:

```bash
npm install
npm run dev
# open http://localhost:4321
```

---

## 2. Implement in this order

Do not start with destination poetry. Start with leaks and guarantees.

### P0 — same day

**A. CMS leaks**

Cause: a tour page renders a missing itinerary as the words `itinerary CSV`, or `duration_days` / `price_from` print as `Inquire`.

Files:

- `src/pages/tours/[slug].astro`
- `src/components/travel/ItineraryTimeline.astro`
- `src/components/travel/ItineraryBlock.astro`
- `src/components/travel/TourCard.astro`
- `data/tours.csv`
- `data/tour_itinerary.csv`

Do:

1. In the `.astro` files, never print the string `itinerary CSV`. If there are no days, print nothing, or: `A written proposal lists the day-by-day once dates are set.`
2. If `duration_days` is empty or the word Inquire, do not show a Duration row.
3. If `price_from` is empty or Inquire, do not show a Price row. Do not invent a dollar figure. Numeric prices already in `tours.csv` may stay only if you still stand behind them — owner has not approved a public inclusions table to go with them.
4. In `data/tours.csv`, replace any `Inquire` duration/price cells with a blank cell, not the word Inquire.

**B. Safety overclaim**

Files:

- `src/pages/about.astro`
- `src/pages/safety.astro`
- `src/pages/index.astro`
- `data/tours.csv` (summaries)
- `data/provinces.csv` / `data/dishes.csv` metas if they contain `safe operational access`
- Veteran Return row in `data/tours.csv` if present — strip `highly secure` and `peacetime`

Replace with planning language from the guidelines. Keep: `Your safety is planned, not promised.` `We do not sell fantasy itineraries.`

**C. Footer / nav 404s**

Files: `src/components/site/Footer.astro`, `src/components/site/Header.astro`

Repo has `src/pages/regions/index.astro` and `src/pages/regions/[slug].astro`.  
Repo has `src/pages/provinces/[slug].astro` and **no** `src/pages/provinces/index.astro`.

So `/provinces/` as a footer link 404s. Either:

- point the label to `/destinations/`, or
- add a thin `src/pages/provinces/index.astro` that lists provinces (that is a page, not a content invention).

`/kabuli-pulao/` 404: do not link that slug. Use the live food-culture slug for Qabuli Palaw.

**D. Dead tour names on destination pages**

Those names are almost certainly coming from `data/tour_attractions_map.csv` or a free-text field on `data/provinces.csv`, not from a designer typing in the template.

Delete or remap:

- Adventure Custom
- Custom Day Trips
- Discovery Tour (bare)
- Custom Cultural Tour
- Westward Exploration
- Classical Afghanistan Tour
- Highland Expedition
- Custom Adventure

Allowed slugs are only those in `data/tours.csv`.

**E. Phone**

File: `src/lib/config.ts`

```ts
phone: {
  display: '+93 780 123 456',   // keep the number; this is display format only
  number: '93780123456',
  url: 'tel:+93780123456',
},
whatsapp: {
  number: '93780123456',
  url: 'https://wa.me/93780123456',
},
```

Do not change the digits.

---

### P1 — next session (copy swaps)

Use the text in `11-revised-master-draft.md`. Map it onto files like this:

| Draft section | File(s) |
|---|---|
| Homepage hero + why-us | `src/pages/index.astro` (Hero title/subtitle props + why-us blocks). Do not build a new emoji trust-bar widget. One sentence is enough. |
| About | `src/pages/about.astro` |
| Safety extension | `src/pages/safety.astro` — keep the three honest headings, add planning sentences only |
| Visa consistency | `src/pages/visa-entry.astro` + homepage LOI line. Must agree: LOI on every booked tour; we do not issue visas. |
| Kabul / Bamyan / Herat / Ghor / Panjshir overviews | `data/provinces.csv` description/why-visit columns for those rows. Template is `src/pages/destinations/[slug].astro` — do not fork the template for one province. |
| Central Afghanistan Discovery overview + days 1–7 | `data/tours.csv` summary for that slug + `data/tour_itinerary.csv` rows for `central-afghanistan-discovery`. Keep the live 7-day spine. Day 2 = pass chosen for conditions, not a fixed Salang or Hajigak. |
| Micro-copy near forms | `src/pages/contact.astro` and WhatsApp button label only. No “Read Traveler Stories.” |
| Footer blurb | `src/components/site/Footer.astro` — replace “breathtaking landscapes… rich culture… expert-guided tours” with one grounded sentence. |
| Config tagline | `src/lib/config.ts` `tagline` / `description` currently use generic “world's most extraordinary destinations.” Rewrite. |

Ghor / Jam: there **is** a CSV tour in the GitHub snapshot:

- `timurid-grandeur-herat-tour-add-minaret-e-jam`

If that row exists locally and `is_active=1`, you may link it from `/destinations/ghor/` and `/attractions/minaret-of-jam/`. Add the winter caveat in the province blurb. Do not invent Highland Expedition.

Kabul & Surroundings CSV already lists Panjshir in `provinces`. Weekend in Kabul does not. Destination page should follow the CSV, not the rejected draft.

---

### P2 — after the public pages stop lying

- Unique dish paragraphs in `data/dishes.csv` (Mantu, Aushak, Bolani, Chapli, Wardak Apples, Ghazni Pulao, Tashqurghan). Stop cloning one paragraph across rows.
- Hotel intro tone in `src/pages/hotels/index.astro` and any “pinnacle of luxury” cell in `data/hotel_properties.csv`.
- FAQ rows in `data/faq.csv` — add planning answers, no guarantees.
- Group-size display consistency in `data/tours.csv` (`group_size_display` vs `max_group_size`). Ask before picking 2–6 vs 2–8 as the public rule.
- Numeric `price_from` values already in CSV: leave them only if you will stand behind them without an inclusions table. Otherwise clear the public display in the template and keep the numbers as internal.

---

## 3. Exact replacement strings (safe to paste)

### `src/lib/config.ts`

Replace tagline/description only. Keep phone digits.

```ts
export const siteConfig = {
  name: 'Afghan Tours',
  tagline: 'Licensed tours from Kabul',
  description: 'American-led, Kabul-based tour operator. Private journeys, Letter of Invitation support on every booked tour. We do not issue visas. We do not sell fantasy itineraries.',
  email: 'info@afghantours.com',
  phone: {
    display: '+93 780 123 456',
    number: '93780123456',
    url: 'tel:+93780123456',
  },
  whatsapp: {
    number: '93780123456',
    url: 'https://wa.me/93780123456',
  },
} as const;
```

### Footer brand sentence

OLD:

```
Discover the breathtaking landscapes, ancient history, and rich culture of Afghanistan with our expert-guided tours.
```

NEW:

```
Licensed Kabul operator. American-led. Private journeys planned around real roads, real seasons, and people we already work with.
```

### Homepage hero (props in `src/pages/index.astro`)

```
title: Afghanistan, Reimagined
subtitle: Not the headlines. The hospitality. The history. The highlands.
```

Body paragraph to add under the hero (not a new component):

```
AfghanTours is a licensed, American-led tour operator based in Kabul. We plan private journeys with local guides, Letter of Invitation support for every booked tour, and routes that can change when the road, the weather, or access changes. We do not sell fantasy itineraries.
```

### Safety closer

```
Your safety is planned, not promised. Itineraries change when road, weather, or access changes. Read your own government’s advisory. Buy insurance that actually covers Afghanistan.
```

### Destination one-liners (CSV why-visit / overview)

Kabul: `The capital at the crossroads — layered, loud, and still the way most journeys begin.`  
Bamyan: `Empty Buddha niches, highland fields, and the lakes at Band-e-Amir when the road allows.`  
Herat: `The Pearl of Khorasan — Timurid tilework, covered bazaars, and a slower western city.`  
Ghor: `Remote highland roads and the 12th-century Minaret of Jam. Not in winter.`  
Panjshir: `A narrow valley north of Kabul — river, terraces, and a long local memory. Access is assessed before each departure.`

Full paragraphs: see `11-revised-master-draft.md`.

---

## 4. What not to implement from the rejected first draft

- “Most trusted”
- “We will keep you safe”
- “Safety-First Operations”
- Armored vehicles on the homepage
- “Visa & LOI Support Included” as if visas are issued
- “Read Traveler Stories”
- Inclusions / exclusions checklist
- Westward Exploration / Classical Afghanistan / Highland Expedition
- Panjshir “defiant” / “historically safe”
- Hajigak “2,700 m”
- Emoji trust bar
- New tour URLs

---

## 5. Verify before you push

```bash
./scripts/audit-afghantours.sh .
npm run build
```

Then click locally:

- `/` hero and why-us
- `/about/`
- `/safety/`
- `/visa-entry/`
- `/tours/central-afghanistan-discovery/`
- `/tours/veteran-return/` if it exists locally
- `/destinations/kabul/` `/bamyan/` `/herat/` `/ghor/` `/panjshir/`
- Footer Regions / Destinations links
- WhatsApp button still `wa.me/93780123456`

Push only after the audit report shows zero P0 hits.

```bash
git checkout -b content/guidelines-p0
git add src data
git status   # read it
git commit -m "Content: remove CMS leaks and safety overclaims; lock LOI and American-led lines"
```

Do not commit `node_modules`, `dist`, or `audit-out`.

---

## 6. Give an agent this prompt

```
Follow AGENT-RULES.md and CONTENT-GUIDELINES.md.
Work only in james-sidiqi/copiloted-astro-afghantours.
Run scripts/audit-afghantours.sh first.
Implement IMPLEMENTATION-PLAN.md in P0 → P1 → P2 order.
Do not create tour slugs. Do not invent prices. Do not promise safety.
Keep +93 780 123 456. Leave [OWNER INPUT REQUIRED] visible when a fact is missing.
```

---

## 7. Files in this package

| File | Use |
|---|---|
| `AGENT-RULES.md` | Paste at the top of any agent task |
| `CONTENT-GUIDELINES.md` | Full rulebook |
| `11-revised-master-draft.md` | Approved replacement copy |
| `10-master-draft-qa.md` | Why the first draft was rejected |
| `scripts/audit-afghantours.sh` | Terminal check of the local repo |
| `IMPLEMENTATION-PLAN.md` | This file |
