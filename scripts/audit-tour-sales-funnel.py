#!/usr/bin/env python3
import csv, pathlib, re
from collections import defaultdict

ROOT = pathlib.Path.cwd()
DATA = ROOT / 'data'
CONTENT = ROOT / 'src' / 'content'

def rows(name):
    with (DATA / name).open(newline='', encoding='utf-8-sig') as f:
        return list(csv.DictReader(f))

def active(r):
    return str(r.get('is_active', r.get('active', '1'))).strip().lower() not in {'0','false','no'}

def norm(v):
    s = str(v or '').lower().replace('&',' and ')
    s = re.sub(r'[_-]+',' ',s)
    s = re.sub(r'\bcity\b',' ',s)
    s = re.sub(r'[^a-z0-9]+',' ',s)
    return re.sub(r'\s+',' ',s).strip()

tours = [r for r in rows('tours.csv') if active(r)]
itin = [r for r in rows('tour_itinerary.csv') if active(r)]
attractions = [r for r in rows('attractions_master.csv') if active(r)]
attrmap = [r for r in rows('tour_attractions_map.csv') if active(r)] if (DATA/'tour_attractions_map.csv').exists() else []
hotels = [r for r in rows('hotel_properties.csv') if active(r)]
dishes = [r for r in rows('dishes.csv') if active(r)]
provinces = [r for r in rows('provinces.csv') if active(r)]

itin_by_tour = defaultdict(list)
for r in itin: itin_by_tour[r.get('tour_slug','')].append(r)

tour_slugs = {r.get('slug') or r.get('tour_slug') for r in tours}
print('AFGHANTOURS TOUR-SALES FUNNEL AUDIT')
print('='*72)
print('Active tours:', len(tours))

mapped_attr = defaultdict(set)
for r in attrmap:
    mapped_attr[r.get('attraction_code')].add(r.get('tour_slug') or r.get('tour_code'))
missing_attr = [a for a in attractions if not mapped_attr.get(a.get('attraction_code'))]
print(f'Attractions: {len(attractions)} total | {len(attractions)-len(missing_attr)} directly mapped | {len(missing_attr)} without direct tour mapping')

food_hits = 0
food_missing = []
for d in dishes:
    tokens = {norm(d.get('slug')), norm(d.get('name'))}
    hit = False
    for r in itin:
        vals = {norm(x) for x in re.split(r'[|;,]', r.get('food_culture','')) if x.strip()}
        if any(t and (t in vals or any(t in v or v in t for v in vals if v)) for t in tokens):
            hit = True; break
    if hit: food_hits += 1
    else: food_missing.append(d.get('slug'))
print(f'Food items: {len(dishes)} total | {food_hits} directly used in itinerary data | {len(food_missing)} not directly used')

hub_tours = defaultdict(set)
for r in itin:
    hub_tours[norm(r.get('overnight_hub') or r.get('location'))].add(r.get('tour_slug'))
hotel_missing=[]
for h in hotels:
    hub=norm(h.get('hub_name') or h.get('destination_code'))
    matched=set()
    for k,v in hub_tours.items():
        if hub and (hub==k or hub in k or k in hub): matched |= v
    if not matched: hotel_missing.append(h.get('hotel_slug'))
print(f'Hotels: {len(hotels)} total | {len(hotels)-len(hotel_missing)} in hubs used by tours | {len(hotel_missing)} in hubs with no current tour overnight')

province_missing=[]
for p in provinces:
    name=norm(p.get('province_name') or p.get('name'))
    code=norm(p.get('province_code'))
    found=False
    for t in tours:
        text=norm(' '.join([t.get('provinces',''),t.get('province',''),t.get('regions',''),t.get('summary','')]))
        if (name and name in text) or (code and code in text): found=True; break
    if not found:
        for r in itin:
            text=norm(' '.join([r.get('location',''),r.get('provinces_traversed','')]))
            if (name and name in text) or (code and code in text): found=True; break
    if not found: province_missing.append(p.get('province_slug') or p.get('slug') or p.get('province_name'))
print(f'Destinations/provinces: {len(provinces)} total | {len(provinces)-len(province_missing)} connected to current tours | {len(province_missing)} without a current tour connection')

culture_files = list((CONTENT/'cultural-experiences').glob('*.md')) if (CONTENT/'cultural-experiences').exists() else []
print(f'Cultural experience pages: {len(culture_files)} (site bridge will connect by direct mention, hub, or province and fall back to featured tours)')
print('Transportation: treated as tour logistics; page will route visitors back to tour products.')

if missing_attr:
    print('\nAttractions needing direct tour mapping (first 20):')
    for x in missing_attr[:20]: print('  -', x.get('attraction_slug') or x.get('name'))
if food_missing:
    print('\nFood items not directly referenced by an itinerary (first 20):')
    for x in food_missing[:20]: print('  -', x)
if hotel_missing:
    print('\nHotels in hubs not currently overnighted by a tour:')
    for x in hotel_missing[:20]: print('  -', x)
if province_missing:
    print('\nDestinations without a current tour connection:')
    for x in province_missing[:20]: print('  -', x)

print('\nPASS CRITERIA: every support page has a path back to a tour; exact "included" claims are only used where the data supports them.')
