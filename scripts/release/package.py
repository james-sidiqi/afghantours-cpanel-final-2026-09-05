#!/usr/bin/env python3
"""Build/verify static-only cPanel releases. No network, credentials, or server writes."""
import argparse
import hashlib
import json
import re
import stat
import sys
import zipfile
from pathlib import Path, PurePosixPath

PAGES = set('about activities attractions cancellation-refund-rescheduling contact cultural-experiences custom-requests destinations faq faqs food-culture hotels hubs privacy regions restaurants return-journeys safety specialist-services terms tours transportation visa-entry'.split())
ROOT_FILES = {'index.html', '404.html', 'robots.txt', 'sitemap.xml', 'version.json'}
ASSET_EXTS = set('.css .js .webp .png .jpg .jpeg .gif .avif .svg .ico .woff .woff2 .ttf .mp4 .webm .webmanifest'.split())
PROTECTED = set('booking manage payments photo-credits private afghantours-private config backup backups'.split())
SHA = re.compile(r'^[0-9a-f]{64}$')
COMMIT = re.compile(r'^[0-9a-f]{40}$')
RELEASE = re.compile(r'^at-[0-9]{8}-[0-9a-f]{8,40}$')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def encoded(value):
    return (json.dumps(value, indent=2, sort_keys=True) + '\n').encode()


def allowed(name):
    p = PurePosixPath(name)
    if not name or str(p) != name or p.is_absolute() or '\\' in name or ':' in name:
        return False
    if any(ord(c) < 32 or ord(c) == 127 for c in name):
        return False
    if any(part.startswith('.') or part.lower() in PROTECTED for part in p.parts):
        return False
    if re.search(r'\.(?:php[0-9]*|phtml|phar|cgi|pl|py|sh|sql|env|bak|zip|tar|gz)(?:\.|$)', name, re.I):
        return False
    if len(p.parts) == 1:
        return name in ROOT_FILES
    if p.parts[0] in {'_astro', 'assets', 'favicon'}:
        return p.suffix.lower() in ASSET_EXTS
    if p.parts[:2] == ('data', 'maps'):
        return p.suffix.lower() in {'.json', '.geojson'}
    return p.parts[0] in PAGES and p.suffix == '.html'


def validate_manifest(m, require_full=False):
    if m.get('schema_version') != 1 or m.get('scope') != 'static-site':
        raise ValueError('Unknown manifest schema/scope')
    if m.get('kind') not in {'full', 'changes'} or require_full and m['kind'] != 'full':
        raise ValueError('A full manifest is required')
    if not COMMIT.fullmatch(m.get('commit_sha', '')) or not RELEASE.fullmatch(m.get('release_id', '')):
        raise ValueError('Invalid release identity')
    if not m['commit_sha'].startswith(m['release_id'].split('-')[-1]):
        raise ValueError('Release ID does not match commit')
    if not isinstance(m.get('built_at'), str) or not m['built_at']:
        raise ValueError('Missing build time')
    if not SHA.fullmatch(m.get('archive_sha256', '')):
        raise ValueError('Invalid archive hash')
    files = m.get('files')
    if not isinstance(files, dict) or 'version.json' not in files:
        raise ValueError('Missing file map/version')
    if m['kind'] == 'full' and not {'index.html', 'robots.txt', 'sitemap.xml'} <= files.keys():
        raise ValueError('Missing required full-site files')
    if any(not allowed(k) or not isinstance(v, str) or not SHA.fullmatch(v) for k, v in files.items()):
        raise ValueError('Unsafe path or invalid file hash in manifest')
    return m


def read_manifest(path, require_full=False):
    return validate_manifest(json.loads(Path(path).read_text()), require_full)


def write_archive(out, identity, files, kind):
    filename = identity['release_id'] + '-' + kind + '.zip'
    # New assets first, pages next, version marker last. Extraction is still NOT atomic.
    names = sorted(files, key=lambda n: (2 if n == 'version.json' else 1 if n.endswith('.html') else 0, n))
    with zipfile.ZipFile(out / filename, 'w', compression=zipfile.ZIP_DEFLATED) as z:
        for name in names:
            info = zipfile.ZipInfo(name, date_time=(2020, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, files[name])
    manifest = {**identity, 'kind': kind, 'archive': filename,
                'archive_sha256': digest((out / filename).read_bytes()),
                'files': {k: digest(v) for k, v in sorted(files.items())}}
    validate_manifest(manifest)
    (out / ('manifest.json' if kind == 'full' else 'changes-manifest.json')).write_bytes(encoded(manifest))
    return manifest


def build(dist, out, commit, release_id, built_at, base=None):
    dist, out = Path(dist).resolve(), Path(out)
    if out.is_symlink() or out.resolve().is_relative_to(dist):
        raise ValueError('Output must be outside dist and not a symlink')
    if out.exists() and any(out.iterdir()):
        raise ValueError('Output must be empty; never overwrite an existing release')
    if not COMMIT.fullmatch(commit) or not RELEASE.fullmatch(release_id) or not commit.startswith(release_id.split('-')[-1]):
        raise ValueError('Use a full commit SHA and matching release ID')
    identity = dict(schema_version=1, scope='static-site', release_id=release_id, commit_sha=commit, built_at=built_at)
    files, excluded = {}, []
    for p in sorted(dist.rglob('*')):
        if p.is_symlink():
            raise ValueError(f'Symlink in build: {p.relative_to(dist)}')
        if not p.is_file():
            continue
        name = p.relative_to(dist).as_posix()
        if name == 'version.json':
            raise ValueError('Remove stale dist/version.json; packager generates the version')
        if allowed(name):
            files[name] = p.read_bytes()
        else:
            excluded.append(name)
    if not {'index.html', 'robots.txt', 'sitemap.xml'} <= files.keys():
        raise ValueError('Incomplete build: index.html, robots.txt and sitemap.xml required')
    previous = read_manifest(base, True) if base else None
    if previous and previous['release_id'] == release_id:
        raise ValueError('Previous and new release IDs must differ')
    files['version.json'] = encoded(identity)
    out.mkdir(parents=True, exist_ok=True)
    full = write_archive(out, identity, files, 'full')
    (out / 'version.json').write_bytes(files['version.json'])
    (out / 'files.sha256').write_text(''.join(f'{h}  {n}\n' for n, h in full['files'].items()))
    (out / 'excluded-paths.json').write_bytes(encoded(excluded))
    if previous:
        old = previous['files']
        changed = {n: b for n, b in files.items() if old.get(n) != digest(b)}
        write_archive(out, identity, changed, 'changes')
        changes = {'base_release_id': previous['release_id'], 'base_commit_sha': previous['commit_sha'],
                   'base_manifest_sha256': digest(Path(base).read_bytes()),
                   'expected_before': {n: old.get(n) for n in sorted(changed)},
                   'added': sorted(files.keys() - old.keys()),
                   'removed_review_only': sorted(old.keys() - files.keys()),
                   'warning': 'No deletions are performed. Verify the entire base before applying a delta.'}
        (out / 'changes.json').write_bytes(encoded(changes))
    (out / 'SHA256SUMS').write_text(''.join(f'{digest(p.read_bytes())}  {p.name}\n' for p in sorted(out.iterdir()) if p.is_file()))
    print(f'Built {release_id}: {len(files)} static files; {len(excluded)} protected/unsupported files excluded')
    return full


def verify(archive, manifest):
    m = read_manifest(manifest)
    if digest(Path(archive).read_bytes()) != m['archive_sha256']:
        raise ValueError('Archive checksum mismatch')
    with zipfile.ZipFile(archive) as z:
        names = z.namelist()
        if len(names) != len(set(names)) or set(names) != set(m['files']):
            raise ValueError('Archive membership/duplicate mismatch')
        for info in z.infolist():
            if not allowed(info.filename) or stat.S_ISLNK(info.external_attr >> 16):
                raise ValueError(f'Unsafe archive entry: {info.filename}')
            if digest(z.read(info)) != m['files'][info.filename]:
                raise ValueError(f'File checksum mismatch: {info.filename}')
        version = json.loads(z.read('version.json'))
        if version != {k: m[k] for k in ('schema_version', 'scope', 'release_id', 'commit_sha', 'built_at')}:
            raise ValueError('Version identity mismatch')
    print(f'Verified {m["release_id"]}: {len(names)} files ({m["kind"]})')


def verify_tree(root, manifest):
    m = read_manifest(manifest, True)
    root = Path(root).resolve()
    bad = []
    for name, expected in m['files'].items():
        p = root / name
        if any(x.is_symlink() for x in [p, *p.parents] if x != root and x.is_relative_to(root)) or not p.is_file() or digest(p.read_bytes()) != expected:
            bad.append(name)
    if bad:
        raise ValueError('Missing/different files: ' + ', '.join(bad))
    print(f'Verified all {len(m["files"])} release-managed files. Extra/server-managed files were not changed or validated.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    b = sub.add_parser('build')
    b.add_argument('--dist', default='dist')
    b.add_argument('--out', required=True)
    b.add_argument('--commit', required=True)
    b.add_argument('--release-id', required=True)
    b.add_argument('--built-at', required=True)
    b.add_argument('--base')
    v = sub.add_parser('verify')
    v.add_argument('archive'); v.add_argument('manifest')
    t = sub.add_parser('verify-tree')
    t.add_argument('root'); t.add_argument('manifest')
    a = parser.parse_args()
    try:
        if a.command == 'build':
            build(a.dist, a.out, a.commit, a.release_id, a.built_at, a.base)
        elif a.command == 'verify':
            verify(a.archive, a.manifest)
        else:
            verify_tree(a.root, a.manifest)
    except (ValueError, OSError, zipfile.BadZipFile) as e:
        parser.exit(1, f'ERROR: {e}\n')


if __name__ == '__main__':
    main()
