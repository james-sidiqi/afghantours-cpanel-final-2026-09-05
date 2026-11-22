import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

REPO = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('integrity_audit', REPO / 'scripts/site_integrity_audit.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class ImageAliasAuditTests(unittest.TestCase):
    def run_audits(self, *, missing_target=False, emitted_alias=False):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'src/data').mkdir(parents=True)
            (root / 'public/assets/images').mkdir(parents=True)
            (root / 'dist').mkdir()
            old, current = '/assets/images/old.webp', '/assets/images/current.webp'
            (root / 'src/data/imagePathAliases.json').write_text(json.dumps({old: current}))
            (root / 'src/example.md').write_text(old)
            if not missing_target:
                (root / 'public/assets/images/current.webp').write_bytes(b'fixture')
            if emitted_alias:
                (root / 'dist/index.html').write_text(f'<img src="{old}">')
            issues = []
            audit.check_image_refs(root, issues)
            result = subprocess.run(['node', str(REPO / 'scripts/audit-images.mjs')], cwd=root, text=True, capture_output=True, check=True)
            return issues, json.loads(result.stdout)

    def test_existing_alias_target_is_valid_source_metadata(self):
        issues, result = self.run_audits()
        self.assertEqual(issues, [])
        self.assertEqual(result['missing_count'], 0)

    def test_missing_alias_target_still_fails_both_audits(self):
        issues, result = self.run_audits(missing_target=True)
        self.assertTrue(issues)
        self.assertGreater(result['missing_count'], 0)

    def test_browser_url_must_exist_directly_even_with_source_alias(self):
        issues, result = self.run_audits(emitted_alias=True)
        self.assertTrue(any(item[3] == 'dist/index.html' for item in issues))
        self.assertGreater(result['missing_count'], 0)
