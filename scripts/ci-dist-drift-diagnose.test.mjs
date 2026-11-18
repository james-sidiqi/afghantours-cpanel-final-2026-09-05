import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const script = fileURLToPath(new URL('./ci-dist-drift-diagnose.mjs', import.meta.url));
test('drift diagnostics handles added/deleted assets and filenames containing spaces', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'afghantours-drift-'));
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    fs.mkdirSync(path.join(root, 'dist/_astro'), { recursive: true });
    fs.writeFileSync(path.join(root, 'dist/_astro/old-hash.css'), 'old');
    fs.writeFileSync(path.join(root, 'dist/with spaces.html'), 'before');
    git(['init']); git(['add', '.']);
    git(['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'baseline']);
    fs.unlinkSync(path.join(root, 'dist/_astro/old-hash.css'));
    fs.writeFileSync(path.join(root, 'dist/_astro/new-hash.css'), 'new');
    fs.writeFileSync(path.join(root, 'dist/with spaces.html'), 'after');
    git(['add', '-A']);
    const output = execFileSync(process.execPath, [script], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    assert.match(output, /old-hash\.css status=deleted/);
    assert.match(output, /new-hash\.css status=added/);
    assert.match(output, /with spaces\.html status=modified/);
    assert.match(output, /first_diff_at/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
