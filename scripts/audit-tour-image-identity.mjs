#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parse } from 'csv-parse/sync';

const root = process.cwd();
const tours = parse(fs.readFileSync(path.join(root, 'data/tours.csv'), 'utf8'), {
  columns: true, skip_empty_lines: true, relax_column_count: true,
});
const active = tours.filter((t) => String(t.is_active ?? '1') !== '0');

function sha(file) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(file));
  return h.digest('hex');
}

const failures = [];
const byHash = new Map();
for (const t of active) {
  const hero = String(t.hero_image_path || t.hero_image || '').trim();
  const full = path.join(root, 'public', hero.replace(/^\//, ''));
  const ownPrefix = `/assets/images/featured-tours/${t.slug}/`;
  if (!hero) failures.push({ slug: t.slug, error: 'empty hero path' });
  else if (!fs.existsSync(full)) failures.push({ slug: t.slug, error: `missing file ${hero}` });
  else if (!hero.startsWith(ownPrefix)) failures.push({ slug: t.slug, error: `hero not under ${ownPrefix}: ${hero}` });
  else {
    const digest = sha(full);
    if (!byHash.has(digest)) byHash.set(digest, []);
    byHash.get(digest).push(t.slug);
  }
}
for (const [digest, slugs] of byHash) {
  if (slugs.length > 1) failures.push({ slug: slugs.join(','), error: `identical hero bytes shared: ${digest.slice(0, 12)}` });
}

const out = { active: active.length, failed: failures.length, failures };
console.log(JSON.stringify(out, null, 2));
if (failures.length) process.exit(1);
