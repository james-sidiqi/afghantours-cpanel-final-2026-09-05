#!/usr/bin/env node
/**
 * Assert built dist pages emit canonical inquiry hrefs for locked products.
 * Does not invent POSTs — reads rendered HTML.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cases = [
  { name: 'Weekend in Kabul', page: 'dist/tours/weekend-in-kabul/index.html', must: ['flow=scheduled', 'entity_code=WKND', 'product_class=scheduled'] },
  { name: 'Winter Circuit', page: 'dist/tours/winter-circuit/index.html', must: ['flow=scheduled', 'entity_code=WNTC'] },
  { name: 'Summer Circuit', page: 'dist/tours/summer-circuit/index.html', must: ['flow=scheduled', 'entity_code=SUMC'] },
  { name: 'Buzkashi Expedition', page: 'dist/tours/buzkashi-expedition/index.html', must: ['flow=scheduled', 'entity_code=BUZE'] },
  { name: 'Central Afghanistan Discovery', page: 'dist/tours/central-afghanistan-discovery/index.html', must: ['flow=private-fixed', 'entity_code=CAD', 'product_class=private-fixed'] },
  { name: 'Bamyan Skiing Tour', page: 'dist/tours/bamyan-skiing-tour/index.html', must: ['flow=private-fixed', 'entity_code=BSKI'] },
  { name: 'Fishing', page: 'dist/activities/fishing/index.html', must: ['flow=activity', 'entity_code=ACT-FSH'] },
  { name: 'Photography & Documentary', page: 'dist/specialist-services/photography-documentary/index.html', must: ['flow=specialist', 'entity_code=PHOT'] },
  { name: 'Diaspora Return', page: 'dist/return-journeys/diaspora/index.html', must: ['flow=return', 'entity_code=DIAS'] },
  { name: 'Build My Journey', page: 'dist/custom-requests/index.html', must: ['flow=custom', 'entity_code=CTME'] },
];

const failures = [];
for (const c of cases) {
  const full = path.join(root, c.page);
  if (!fs.existsSync(full)) {
    failures.push({ name: c.name, error: `missing page ${c.page}` });
    continue;
  }
  const html = fs.readFileSync(full, 'utf8').replace(/&#38;/g, '&');
  const missing = c.must.filter((token) => !html.includes(token));
  if (missing.length) failures.push({ name: c.name, error: `missing tokens: ${missing.join(', ')}` });
}

const out = { checked: cases.length, failed: failures.length, failures };
console.log(JSON.stringify(out, null, 2));
if (failures.length) process.exit(1);
