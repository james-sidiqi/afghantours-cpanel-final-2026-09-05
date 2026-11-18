import csv
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

REPO = Path(__file__).resolve().parents[2]


class TourImageIdentityTests(unittest.TestCase):
    def check(self, rows, aliases, files):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'data').mkdir()
            (root / 'src/data').mkdir(parents=True)
            (root / 'src/data/imagePathAliases.json').write_text(json.dumps(aliases))
            with (root / 'data/tours.csv').open('w', newline='') as stream:
                writer = csv.DictWriter(stream, fieldnames=['slug', 'hero_image_path', 'is_active'])
                writer.writeheader()
                writer.writerows(rows)
            for url in files:
                file = root / 'public' / url.lstrip('/')
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_bytes(b'photo')
            result = subprocess.run(['node', str(REPO / 'scripts/audit-tour-image-identity.mjs')], cwd=root, text=True, capture_output=True)
            return result.returncode, json.loads(result.stdout)

    def test_deduplicated_owner_hero_resolves_through_its_explicit_alias(self):
        target = '/assets/images/attractions/mountains/hero.webp'
        code, data = self.check([{'slug': 'spring', 'hero_image_path': target, 'is_active': '1'}], {'/assets/images/tours/featured/spring/hero.webp': target}, [target])
        self.assertEqual(code, 0)
        self.assertEqual(data['failed'], 0)

    def test_unrelated_out_of_folder_photo_still_fails(self):
        target = '/assets/images/attractions/unrelated/hero.webp'
        code, _ = self.check([{'slug': 'spring', 'hero_image_path': target, 'is_active': '1'}], {}, [target])
        self.assertNotEqual(code, 0)

    def test_missing_alias_target_still_fails(self):
        target = '/assets/images/attractions/mountains/hero.webp'
        code, _ = self.check([{'slug': 'spring', 'hero_image_path': target, 'is_active': '1'}], {'/assets/images/tours/featured/spring/hero.webp': target}, [])
        self.assertNotEqual(code, 0)

    def test_identical_heroes_for_different_active_tours_still_fail(self):
        target = '/assets/images/attractions/mountains/hero.webp'
        rows = [{'slug': slug, 'hero_image_path': target, 'is_active': '1'} for slug in ['spring', 'fall']]
        aliases = {f'/assets/images/tours/featured/{row["slug"]}/hero.webp': target for row in rows}
        code, data = self.check(rows, aliases, [target])
        self.assertNotEqual(code, 0)
        self.assertIn('identical hero bytes', data['failures'][0]['error'])
