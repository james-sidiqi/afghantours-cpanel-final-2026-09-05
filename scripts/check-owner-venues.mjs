import fs from 'node:fs';
import { parse } from 'csv-parse/sync';

const read = name => parse(fs.readFileSync(name, 'utf8'), { columns: true, skip_empty_lines: true });
const active = new Set(read('data/culinary_experiences.csv').filter(r => /^(1|true)$/i.test(r.is_active)).map(r => r.slug));
const seen = new Set();
let pending = 0;
for (const row of read('data/venue_details.csv')) {
  if (!active.has(row.experience_slug) || seen.has(row.experience_slug)) throw new Error(`Unknown/duplicate venue: ${row.experience_slug}`);
  seen.add(row.experience_slug);
  if (row.verification_status === 'pending') { pending++; continue; }
  if (row.verification_status !== 'operator-confirmed') throw new Error(`Use pending or operator-confirmed: ${row.experience_slug}`);
  for (const key of ['venue_name', 'address', 'verified_on', 'confirmation_notes']) {
    if (!row[key]?.trim()) throw new Error(`Confirmed venue needs ${key}: ${row.experience_slug}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.verified_on) || new Date(row.verified_on).toISOString().slice(0, 10) !== row.verified_on) {
    throw new Error(`Use a real YYYY-MM-DD verification date: ${row.experience_slug}`);
  }
}
if ([...active].some(slug => !seen.has(slug))) throw new Error('Active culinary experience missing from venue worksheet');
console.log(`Venue worksheet valid: ${seen.size} entries; ${pending} pending owner confirmation. Pending addresses are not published.`);
