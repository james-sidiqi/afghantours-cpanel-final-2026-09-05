#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

TEXT_EXTS = {'.astro', '.md', '.csv', '.ts', '.js', '.mjs', '.json', '.html'}
SKIP_PARTS = {'node_modules', 'dist', '.git', '.astro', '_inactive'}
FORBIDDEN = [
    'Kunar should be fish',
    'Logar should not duplicate Wardak',
    'Operational note',
    'These should eventually be connected directly',
    'should connect back to hubs and itineraries rather than sit as disconnected recipe cards',
    'We do not sell fantasy itineraries',
]
COLLAPSED_WORDS = {
    'yogurtbased': 'yogurt-based',
    'Highaltitude': 'High-altitude',
    'BandeAmir': 'Band-e-Amir',
    'centuriesold': 'centuries-old',
    'Worldrenowned': 'World-renowned',
}


def iter_text_files(root: Path):
    for base in [root / 'src', root / 'data', root / 'public']:
        if not base.exists():
            continue
        for p in base.rglob('*'):
            if not p.is_file() or p.suffix.lower() not in TEXT_EXTS:
                continue
            if any(part in SKIP_PARTS for part in p.parts):
                continue
            yield p


def rel(root: Path, p: Path) -> str:
    try:
        return str(p.relative_to(root))
    except ValueError:
        return str(p)


def add_issue(issues, severity, category, message, path=None):
    issues.append((severity, category, message, path))


def check_text(root: Path, issues):
    for p in iter_text_files(root):
        try:
            text = p.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            continue
        for phrase in FORBIDDEN:
            if phrase in text:
                add_issue(issues, 'ERROR', 'published-editorial-note', f'Internal/editorial wording still present: {phrase!r}', rel(root, p))
        # Visible exact-word Ash only; do not flag slug filenames or lowercase route fragments.
        if re.search(r'(?<![-\w])Ash(?![-\w])', text):
            add_issue(issues, 'WARN', 'terminology', 'Visible "Ash" remains; food term should display as "Aush".', rel(root, p))
        for bad, good in COLLAPSED_WORDS.items():
            if bad in text:
                add_issue(issues, 'WARN', 'copy-quality', f'Collapsed word {bad!r}; expected {good!r}.', rel(root, p))


def check_image_refs(root: Path, issues):
    asset_re = re.compile(r"/assets/[A-Za-z0-9_./()\-]+\.(?:webp|png|jpe?g|gif|svg|mp4|webm|mov)", re.I)
    seen = set()
    for p in iter_text_files(root):
        try:
            text = p.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            continue
        for ref in asset_re.findall(text):
            key = (rel(root, p), ref)
            if key in seen:
                continue
            seen.add(key)
            target = root / 'public' / ref.lstrip('/')
            if not target.exists():
                add_issue(issues, 'ERROR', 'missing-asset', f'Referenced asset does not exist: {ref}', rel(root, p))


def read_csv(path: Path):
    with path.open(encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


def check_tour_integrity(root: Path, issues):
    tours_path = root / 'data' / 'tours.csv'
    itin_path = root / 'data' / 'tour_itinerary.csv'
    if not (tours_path.exists() and itin_path.exists()):
        return
    tours = read_csv(tours_path)
    itinerary = read_csv(itin_path)
    by_slug = defaultdict(list)
    for row in itinerary:
        if str(row.get('is_active', '1')).strip() == '0':
            continue
        slug = (row.get('tour_slug') or '').strip()
        if slug:
            by_slug[slug].append(row)
    for t in tours:
        if str(t.get('is_active', '1')).strip() == '0':
            continue
        slug = (t.get('slug') or '').strip()
        if not slug:
            continue
        rows = by_slug.get(slug, [])
        declared = str(t.get('duration_days') or '').strip()
        if declared.isdigit() and rows and int(declared) != len(rows):
            add_issue(issues, 'WARN', 'tour-data', f'{slug}: declared duration {declared} days but {len(rows)} active itinerary rows.', 'data/tours.csv')
        days = []
        for r in rows:
            raw = str(r.get('day_number') or '').strip()
            try:
                days.append(int(float(raw)))
            except ValueError:
                pass
        if days and sorted(days) != list(range(min(days), max(days) + 1)):
            add_issue(issues, 'WARN', 'tour-data', f'{slug}: non-contiguous or duplicated day numbers: {days}', 'data/tour_itinerary.csv')
        hubs = [str(r.get('overnight_hub') or '').strip() for r in rows if str(r.get('overnight_hub') or '').strip()]
        dup_hubs = [k for k, v in Counter(hubs).items() if v > 1]
        if dup_hubs:
            add_issue(issues, 'INFO', 'normalization', f'{slug}: repeated overnight hubs in daily data ({", ".join(dup_hubs)}). Customer hub summary should deduplicate.', 'data/tour_itinerary.csv')


def check_custom_expedition(root: Path, issues):
    path = root / 'data' / 'tour_itinerary.csv'
    if not path.exists():
        return
    rows = [r for r in read_csv(path) if (r.get('tour_slug') or '').strip() == 'custom-expedition' and str(r.get('is_active', '1')).strip() != '0']
    if not rows:
        return
    locations = [(r.get('location') or '').strip() for r in rows]
    # Flag suspicious repetition rather than auto-rewrite.
    c = Counter(x for x in locations if x)
    repeated = [f'{k}×{v}' for k, v in c.items() if v >= 2]
    if repeated:
        add_issue(issues, 'WARN', 'custom-expedition', 'Custom Expedition contains repeated daily locations and should be manually reviewed: ' + ', '.join(repeated), 'data/tour_itinerary.csv')



def check_built_output(root: Path, issues):
    dist = root / 'dist'
    if not dist.exists():
        return
    leak_patterns = [
        (r'(?i)tour_code\s*:', 'raw tour_code/frontmatter appears in built HTML'),
        (r'(?i)duration_days\s*:', 'raw duration_days/frontmatter appears in built HTML'),
        (r'(?i)hero_image_path\s*:', 'raw hero_image_path/frontmatter appears in built HTML'),
        (r'(?i)Kunar should be fish', 'internal Kunar editorial instruction appears in built HTML'),
        (r'(?i)Logar should not duplicate Wardak', 'internal Logar editorial instruction appears in built HTML'),
        (r'(?i)Operational note', 'internal Operational note label appears in built HTML'),
    ]
    for html in dist.rglob('*.html'):
        try:
            text = html.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            continue
        for pattern, message in leak_patterns:
            if re.search(pattern, text):
                add_issue(issues, 'ERROR', 'built-output-leak', message, rel(root, html))


def main():
    ap = argparse.ArgumentParser(description='AfghanTours source integrity audit')
    ap.add_argument('root', nargs='?', default='.', help='project root')
    ap.add_argument('--strict', action='store_true', help='exit non-zero when ERROR issues exist')
    args = ap.parse_args()
    root = Path(args.root).resolve()
    issues = []
    check_text(root, issues)
    check_image_refs(root, issues)
    check_tour_integrity(root, issues)
    check_custom_expedition(root, issues)
    check_built_output(root, issues)

    order = {'ERROR': 0, 'WARN': 1, 'INFO': 2}
    issues.sort(key=lambda x: (order.get(x[0], 9), x[1], x[3] or '', x[2]))

    counts = Counter(i[0] for i in issues)
    print('AFGHANTOURS SITE INTEGRITY AUDIT')
    print('=' * 72)
    print(f'Project: {root}')
    print(f"ERROR={counts['ERROR']}  WARN={counts['WARN']}  INFO={counts['INFO']}")
    print()
    if not issues:
        print('No issues detected by this audit.')
    else:
        for severity, category, message, path in issues:
            where = f' [{path}]' if path else ''
            print(f'{severity:<5} {category:<24} {message}{where}')

    if args.strict and counts['ERROR']:
        return 2
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
