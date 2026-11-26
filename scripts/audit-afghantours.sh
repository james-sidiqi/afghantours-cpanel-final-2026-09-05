#!/usr/bin/env bash
# AfghanTours local content audit — run from the repo root on the MacBook.
# Usage:
#   chmod +x audit-afghantours.sh
#   ./audit-afghantours.sh
# Or:
#   bash audit-afghantours.sh /path/to/copiloted-astro-afghantours

set -euo pipefail

ROOT="${1:-.}"
cd "$ROOT"

if [[ ! -f package.json ]] || [[ ! -d src ]] || [[ ! -d data ]]; then
  echo "ERROR: This does not look like copiloted-astro-afghantours."
  echo "cd into the repo, or pass the path: bash audit-afghantours.sh ~/path/to/repo"
  exit 1
fi

OUT="audit-out"
mkdir -p "$OUT"
STAMP="$(date +%Y%m%d-%H%M%S)"
REPORT="$OUT/audit-$STAMP.txt"

{
  echo "AfghanTours local audit  $STAMP"
  echo "Repo: $(pwd)"
  echo "Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  echo "Commit: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
  echo
} | tee "$REPORT"

note() { printf '\n== %s ==\n' "$1" | tee -a "$REPORT"; }
hits() {
  local label="$1"; shift
  note "$label"
  if grep -RIn --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git --exclude-dir=audit-out "$@" src data 2>/dev/null | tee -a "$REPORT" | wc -l | awk '{print $1 " matches"}'; then
    :
  else
    echo "(none)" | tee -a "$REPORT"
  fi
}

note "0. Repo shape"
echo "src/pages:" | tee -a "$REPORT"
find src/pages -name '*.astro' | sort | tee -a "$REPORT"
echo | tee -a "$REPORT"
echo "data CSVs:" | tee -a "$REPORT"
ls data/*.csv | tee -a "$REPORT"

hits "1. CMS leaks (P0)" -E 'itinerary CSV|Inquire Days|\$Inquire|Inquire days of guided travel|lorem|TODO|TBD|placeholder'
hits "2. Safety overclaim (P0)" -E -i 'highly secure|peacetime|historically safe|we will keep you safe|guaranteed safe|risk-?free|most trusted|safety-first|safe operational access|real-time monitoring|vetted daily'
hits "3. Generic AI travel language (P1)" -E -i 'unforgettable|hidden gem|once-in-a-lifetime|breathtaking|vibrant tapestry|rich tapestry|discover the magic|where history comes alive|ultimate adventure|bucket-list|pinnacle of luxury|crown jewel|seduces you'
hits "4. Fake tour names (P0 if published)" -E -i 'Westward Exploration|Classical Afghanistan Tour|Highland Expedition|Custom Adventure|Adventure Custom|Custom Day Trips|Custom Cultural Tour'
hits "5. Dead nav targets" -E "href: '/provinces'|href: '/regions'|href=\"/provinces\"|href=\"/regions\"|/provinces'|/regions'"
hits "6. Visa overclaim" -E -i 'visa included|visas included|we issue visas'

note "7. Phone / WhatsApp (keep +93 780 123 456 — do not replace)"
grep -RIn --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git -E '780.?123.?456|78-012-3456|wa.me/93780123456|siteConfig.phone' src data 2>/dev/null | tee -a "$REPORT" || true

note "8. Tour slugs in data/tours.csv"
if [[ -f data/tours.csv ]]; then
  python3 - <<'PY' | tee -a "$REPORT"
import csv
from pathlib import Path
rows=list(csv.DictReader(Path("data/tours.csv").open(newline="", encoding="utf-8-sig")))
print(f"{len(rows)} tours")
print(f"{'slug':<48} {'days':<8} {'price_from':<12} {'season'}")
for r in rows:
    print(f"{r.get('slug',''):<48} {r.get('duration_days',''):<8} {r.get('price_from',''):<12} {r.get('season','')}")
PY
fi

note "9. Duration / price fields that look unfinished"
if [[ -f data/tours.csv ]]; then
  python3 - <<'PY' | tee -a "$REPORT"
import csv
from pathlib import Path
rows=list(csv.DictReader(Path("data/tours.csv").open(newline="", encoding="utf-8-sig")))
for r in rows:
    days=str(r.get("duration_days","")).strip()
    price=str(r.get("price_from","")).strip().lower()
    slug=r.get("slug","")
    flags=[]
    if days.lower() in {"","inquire","inquire days","0"}: flags.append(f"duration={days or 'EMPTY'}")
    if price in {"","inquire","$inquire","0"}: flags.append(f"price={price or 'EMPTY'}")
    if flags:
        print(f"{slug}: {', '.join(flags)}")
print("done")
PY
fi

note "10. Destination / food pages with thin or missing body fields"
if [[ -f data/provinces.csv ]]; then
  python3 - <<'PY' | tee -a "$REPORT"
import csv
from pathlib import Path
p=Path("data/provinces.csv")
rows=list(csv.DictReader(p.open(newline="", encoding="utf-8-sig")))
print(f"provinces.csv columns: {list(rows[0].keys()) if rows else 'NONE'}")
# print first row keys only; flag empty description-like fields
desc_keys=[k for k in (rows[0].keys() if rows else []) if any(x in k.lower() for x in ("desc","overview","summary","why","intro","body"))]
print("description-like columns:", desc_keys)
for r in rows:
    empty=[k for k in desc_keys if not str(r.get(k,"")).strip()]
    if empty:
        name=r.get("name") or r.get("province") or r.get("slug") or "?"
        print(f"  {name}: empty {empty}")
PY
fi
if [[ -f data/dishes.csv ]]; then
  python3 - <<'PY' | tee -a "$REPORT"
import csv
from pathlib import Path
rows=list(csv.DictReader(Path("data/dishes.csv").open(newline="", encoding="utf-8-sig")))
print(f"\ndishes.csv: {len(rows)} rows")
print("columns:", list(rows[0].keys()) if rows else "NONE")
from collections import Counter
# detect boilerplate by identical long text fields
text_keys=[k for k in (rows[0].keys() if rows else []) if any(x in k.lower() for x in ("desc","overview","summary","body","text"))]
for k in text_keys:
    vals=[str(r.get(k,"")).strip() for r in rows]
    c=Counter(vals)
    dup=[(t,n) for t,n in c.items() if t and n>=3]
    if dup:
        print(f"BOILERPLATE in {k}:")
        for t,n in dup:
            print(f"  x{n}: {t[:140]}...")
PY
fi

note "11. Itinerary rows vs tour slugs"
if [[ -f data/tour_itinerary.csv && -f data/tours.csv ]]; then
  python3 - <<'PY' | tee -a "$REPORT"
import csv
from pathlib import Path
tours={r["slug"] for r in csv.DictReader(Path("data/tours.csv").open(newline="", encoding="utf-8-sig")) if r.get("slug")}
itin=list(csv.DictReader(Path("data/tour_itinerary.csv").open(newline="", encoding="utf-8-sig")))
slug_key="tour_slug" if "tour_slug" in (itin[0].keys() if itin else []) else list(itin[0].keys())[0]
from collections import defaultdict
days=defaultdict(int)
unknown=set()
for r in itin:
    s=r.get(slug_key) or r.get("slug") or ""
    days[s]+=1
    if s not in tours:
        unknown.add(s)
print(f"itinerary rows: {len(itin)}")
print("days per slug:")
for s in sorted(tours):
    print(f"  {s}: {days.get(s,0)} days")
if unknown:
    print("itinerary slugs not in tours.csv:")
    for s in sorted(unknown):
        print(f"  {s}")
missing=[s for s in sorted(tours) if days.get(s,0)==0]
if missing:
    print("tours with ZERO itinerary days (likely 'itinerary CSV' leak on live page):")
    for s in missing:
        print(f"  {s}")
PY
fi

note "12. Header / footer / homepage key strings"
for f in src/pages/index.astro src/pages/about.astro src/pages/safety.astro src/pages/visa-entry.astro src/components/site/Header.astro src/components/site/Footer.astro src/lib/config.ts; do
  if [[ -f "$f" ]]; then
    echo "--- $f ---" | tee -a "$REPORT"
  fi
done

echo | tee -a "$REPORT"
echo "Report written to $REPORT"
echo "Open it with:  open $REPORT"
echo
echo "Next: keep this report. Implement P0 hits first using IMPLEMENTATION-PLAN.md"
