#!/usr/bin/env python3
"""Apply the PROVISIONAL ADTF Autumn 11-day draft to a working tree, for local preview or for
promotion after owner approval. Never run this on a branch that will be deployed without approval.
Usage: python3 docs/drafts/ADTF-autumn-11d-PROVISIONAL/apply-draft.py [repo_root]
Not applied: departures (owner decision per record) and the cross-link edits in proposed-changes.json."""
import csv, io, json, sys, shutil, os
R = sys.argv[1] if len(sys.argv) > 1 else '.'
D = os.path.join(R, 'docs/drafts/ADTF-autumn-11d-PROVISIONAL')
def rd(p):
    raw = open(p, newline='', encoding='utf-8').read(); eol = '\r\n' if '\r\n' in raw else '\n'
    return list(csv.reader(io.StringIO(raw))), eol
def wr(p, rows, eol):
    o = io.StringIO(); csv.writer(o, lineterminator=eol).writerows(rows); open(p, 'w', newline='', encoding='utf-8').write(o.getvalue())
for name in ('tour_itinerary', 'tour_attractions_map'):
    p = os.path.join(R, 'data', name + '.csv'); rows, eol = rd(p); draft, _ = rd(os.path.join(D, name + '.ADTF.csv'))
    out = [rows[0]]; placed = False
    for r in rows[1:]:
        if r and r[0] == 'ADTF':
            if not placed: out += draft[1:]; placed = True
            continue
        out.append(r)
    if not placed: out += draft[1:]
    wr(p, out, eol)
prop = json.load(open(os.path.join(D, 'proposed-changes.json'), encoding='utf-8'))
p = os.path.join(R, 'data/tours.csv'); rows, eol = rd(p); ix = {h: i for i, h in enumerate(rows[0])}
for r in rows[1:]:
    if r[0] == 'ADTF':
        for k, v in prop['tours_csv'].items(): r[ix[k]] = v
wr(p, rows, eol)
p = os.path.join(R, 'data/booking/tours-catalog.json'); cat = json.load(open(p, encoding='utf-8'))
for t in cat['tours']:
    if t.get('code') == 'ADTF':
        t['duration_days'] = prop['catalog']['duration_days']; t['nights'] = prop['catalog']['nights']; t['duration_display'] = prop['catalog']['duration_display']
open(p, 'w', encoding='utf-8').write(json.dumps(cat, indent=2, ensure_ascii=False) + '\n')
shutil.copyfile(os.path.join(D, 'afghanistan-discovery-tour-fall.md'), os.path.join(R, 'src/content/tours/afghanistan-discovery-tour-fall.md'))
print('ADTF provisional draft applied. Departures NOT changed: validate-booking-data will report ADTF duration mismatches until the owner decides each departure.')
