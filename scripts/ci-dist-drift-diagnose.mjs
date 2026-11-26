#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

const files = sh('git diff --cached --name-only -- dist/')
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean);

for (const f of files.slice(0, 10)) {
  const head = sh(`git show HEAD:${f}`);
  const staged = sh(`git show :0:${f}`);
  console.log(`\n===== ${f} head_len=${head.length} staged_len=${staged.length} =====`);
  if (head === staged) {
    print('identical');
    continue;
  }
  const n = Math.min(head.length, staged.length);
  let i = 0;
  for (; i < n; i++) if (head[i] !== staged[i]) break;
  console.log('first_diff_at', i);
  console.log('HEAD ', JSON.stringify(head.slice(Math.max(0, i - 80), i + 160)));
  console.log('BUILD', JSON.stringify(staged.slice(Math.max(0, i - 80), i + 160)));

  const tok = (s) => new Set(s.match(/[A-Za-z0-9_./@-]{10,}/g) || []);
  const th = tok(head);
  const tb = tok(staged);
  const onlyHead = [...th].filter((x) => !tb.has(x)).sort().slice(0, 30);
  const onlyBuild = [...tb].filter((x) => !th.has(x)).sort().slice(0, 30);
  console.log('only_in_HEAD', onlyHead);
  console.log('only_in_BUILD', onlyBuild);
}
