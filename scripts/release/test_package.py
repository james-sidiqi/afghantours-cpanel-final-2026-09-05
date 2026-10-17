import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

spec = importlib.util.spec_from_file_location('release_package', Path(__file__).with_name('package.py'))
pkg = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pkg)


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.dist = self.root / 'dist'
        self.dist.mkdir()
        self.out = self.root / 'out'
        for name in ['index.html', 'robots.txt', 'sitemap.xml', 'assets/site.css', 'tours/test/index.html']:
            self.put(name, 'original')

    def put(self, name, content):
        path = self.dist / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)

    def build(self, out=None, sha='a' * 40, base=None):
        return pkg.build(self.dist, out or self.out, sha, 'at-20261018-' + sha[:8], '2026-10-18T00:00:00Z', base)

    def test_protected_paths_never_ship(self):
        for name in ['.htaccess', 'tour-inquiry.php', 'booking/departures.php', 'manage/index.php',
                     'data/booking/inventory.json', '.well-known/token', 'photo-credits/index.html',
                     'assets/backup.zip', 'assets/bad.php.jpg', 'assets/.secret.json', 'private/x.html',
                     'pages/index.mjs', '_astro/server.mjs', 'unknown/index.html']:
            self.put(name, 'DO NOT SHIP')
        self.put('data/maps/hubs.json', '{}')
        m = self.build()
        self.assertEqual(len(m['files']), 7)
        pkg.verify(self.out / m['archive'], self.out / 'manifest.json')
        with zipfile.ZipFile(self.out / m['archive']) as z:
            self.assertEqual(z.namelist()[-1], 'version.json')
            for info in z.infolist():
                self.assertEqual((info.external_attr >> 16) & 0o777, 0o644)

    def test_delta_tracks_base_additions_and_removals(self):
        first = self.build()
        self.put('index.html', 'updated')
        self.put('assets/new.css', 'new')
        (self.dist / 'assets/site.css').unlink()
        second = self.root / 'second'
        self.build(second, 'b' * 40, self.out / 'manifest.json')
        change = json.loads((second / 'changes.json').read_text())
        self.assertEqual(change['base_release_id'], first['release_id'])
        self.assertEqual(change['removed_review_only'], ['assets/site.css'])
        self.assertEqual(change['added'], ['assets/new.css'])
        self.assertIsNone(change['expected_before']['assets/new.css'])
        delta = pkg.read_manifest(second / 'changes-manifest.json')
        self.assertEqual(set(delta['files']), {'index.html', 'assets/new.css', 'version.json'})
        pkg.verify(second / delta['archive'], second / 'changes-manifest.json')

    def test_tampered_zip_fails(self):
        m = self.build()
        path = self.out / m['archive']
        path.write_bytes(path.read_bytes() + b'tampered')
        with self.assertRaises(ValueError):
            pkg.verify(path, self.out / 'manifest.json')

    def test_symlinks_and_stale_versions_fail(self):
        link = self.dist / 'assets/link.css'
        link.symlink_to(self.dist / 'index.html')
        with self.assertRaises(ValueError):
            self.build()
        link.unlink()
        self.put('version.json', '{}')
        with self.assertRaises(ValueError):
            self.build()

    def test_output_and_identity_guards(self):
        with self.assertRaises(ValueError):
            self.build(self.dist / 'output')
        with self.assertRaises(ValueError):
            self.build(sha='not-a-commit')
        self.build()
        with self.assertRaises(ValueError):
            self.build()

    def test_path_guards(self):
        for path in ['../index.html', '/index.html', 'assets/../index.html', 'assets//x.js',
                     'assets/x.php.png', 'assets/BOOKING/x.js', 'assets/x\n.js', 'assets\\x.js',
                     'assets/C:x.js', './index.html', 'unknown/index.html']:
            self.assertFalse(pkg.allowed(path), path)

    def test_reproducible_and_full_tree_verification(self):
        m = self.build()
        other = self.root / 'other'
        m2 = self.build(other)
        self.assertEqual(m['archive_sha256'], m2['archive_sha256'])
        downloaded = self.root / 'downloaded'
        with zipfile.ZipFile(self.out / m['archive']) as z:
            z.extractall(downloaded)
        (downloaded / 'server-managed.txt').write_text('preserve')
        pkg.verify_tree(downloaded, self.out / 'manifest.json')
        (downloaded / 'index.html').write_text('drift')
        with self.assertRaises(ValueError):
            pkg.verify_tree(downloaded, self.out / 'manifest.json')

    def test_base_cannot_inject_protected_deletions(self):
        self.build()
        path = self.out / 'manifest.json'
        m = json.loads(path.read_text())
        m['files']['booking/inventory.json'] = 'a' * 64
        path.write_text(json.dumps(m))
        with self.assertRaises(ValueError):
            self.build(self.root / 'second', 'b' * 40, path)


if __name__ == '__main__':
    unittest.main()
