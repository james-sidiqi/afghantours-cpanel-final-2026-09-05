// Owner 2026-11-21: supplier costs are private and must not return to the public repo or build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const COST_HEADER = /(^|,)(nightly_cost_[a-z]+|nightly_sell_price_[a-z]+|cost_usd|cost_afn|supplier_cost[a-z_]*|net_rate[a-z_]*|markup[a-z_]*|margin[a-z_]*)(,|$)/i;

test('public data CSVs carry no supplier-cost columns', () => {
  const offenders = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.csv')) {
        const header = fs.readFileSync(p, 'utf8').split(/\r?\n/, 1)[0];
        if (COST_HEADER.test(header)) offenders.push(p);
      }
    }
  };
  walk('data');
  assert.deepEqual(offenders, []);
});

test('removed private costing files stay out of the repository', () => {
  for (const p of ['data/pricing_reference.csv', 'docs/HOTEL-ROOM-COSTS-20261119.md', 'docs/OPERATING-COST-GAPS-20261119.md']) {
    assert.equal(fs.existsSync(p), false, p);
  }
});
