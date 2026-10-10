// Writes JS public projections of every seed departure for test-core.php to compare against PHP.
import { readFileSync, writeFileSync } from 'node:fs';
import { publicDeparture } from '../../src/lib/booking/core.mjs';
const deps = JSON.parse(readFileSync('data/booking/departures.json', 'utf8')).departures;
const settings = JSON.parse(readFileSync('data/booking/settings.json', 'utf8'));
const today = '2026-10-10';
const rows = Object.fromEntries(deps.map((d) => [d.id, publicDeparture(d, null, settings, today)]));
writeFileSync(new URL('./.parity.json', import.meta.url), JSON.stringify({ today, rows }));
console.log(`parity fixtures: ${deps.length}`);
