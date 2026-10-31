#!/usr/bin/env python3
"""Read-only comparison of an incoming attraction ZIP/folder. Never imports images."""
import argparse
import csv
import hashlib
import sys
import zipfile
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('incoming', type=Path, help='Your standardized ZIP or extracted attraction folder')
    parser.add_argument('--output', type=Path, help='Optional CSV report; default prints to the terminal')
    args = parser.parse_args()
    with (ROOT / 'data/attractions_master.csv').open(newline='', encoding='utf-8-sig') as stream:
        attractions = {r['slug']: r for r in csv.DictReader(stream)}

    def compare(name, data):
        parts = PurePosixPath(name.replace('\\', '/')).parts
        if '..' in parts or name.startswith('/'):
            raise ValueError('Unsafe archive path: ' + name)
        if '__MACOSX' in parts or any(p.startswith('.') for p in parts):
            return None
        if PurePosixPath(name).suffix.lower() not in {'.webp', '.png', '.jpg', '.jpeg', '.avif'}:
            return None
        index = next((i for i, p in enumerate(parts) if p in attractions), None)
        if index is None:
            return ['UNMAPPED', '', name, '', '', digest(data), 'Choose the exact attraction slug manually; no import performed']
        slug = parts[index]
        relative = 'public/assets/images/attractions/' + '/'.join(parts[index:])
        target = ROOT / relative
        before = digest(target.read_bytes()) if target.is_file() else ''
        after = digest(data)
        status = 'SAME' if before == after else ('REPLACE' if before else 'ADD')
        note = 'Attraction is inactive; image import must not republish it' if attractions[slug]['is_active'] == '0' else ''
        return [status, slug, name, relative, before, after, note]

    rows = []
    if args.incoming.is_dir():
        base = args.incoming.resolve()
        for source in sorted(base.rglob('*')):
            if source.is_file() and not source.is_symlink():
                # Include the directory's own name when a single attraction was supplied.
                name = str(source.relative_to(base.parent if base.name in attractions else base))
                row = compare(name, source.read_bytes())
                if row: rows.append(row)
    else:
        with zipfile.ZipFile(args.incoming) as archive:
            for info in archive.infolist():
                if not info.is_dir():
                    row = compare(info.filename, archive.read(info))
                    if row: rows.append(row)
    if args.output:
        output = args.output.resolve()
        if output.suffix.lower() != '.csv' or any(parent in output.parents for parent in [ROOT / 'public', ROOT / 'dist']):
            raise ValueError('Write the CSV outside public/ and dist/; images are never an output target')
        output.parent.mkdir(parents=True, exist_ok=True)
        stream = output.open('x', newline='', encoding='utf-8')
    else:
        stream = sys.stdout
    try:
        writer = csv.writer(stream)
        writer.writerow(['action', 'attraction_slug', 'incoming_path', 'repository_path', 'existing_sha256', 'incoming_sha256', 'review_note'])
        writer.writerows(rows)
    finally:
        if stream is not sys.stdout: stream.close()
    print(f'{len(rows)} images compared. No image files copied, replaced, renamed or deleted.', file=sys.stderr)


if __name__ == '__main__':
    main()
