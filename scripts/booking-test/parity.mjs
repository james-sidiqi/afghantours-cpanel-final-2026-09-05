// Writes JS public projections of every seed departure for test-core.php to compare against PHP.
import { readFileSync, writeFileSync } from 'node:fs';
import { publicDeparture, isListed } from '../../src/lib/booking/core.mjs';
const deps = JSON.parse(readFileSync('data/booking/departures.json', 'utf8')).departures;
const settings = { ...JSON.parse(readFileSync('data/booking/settings.json', 'utf8')), religious_calendar: JSON.parse(readFileSync('data/booking/religious-calendar.json', 'utf8')) };
const today = '2026-10-10';
const rows = Object.fromEntries(deps.map((d) => [d.id, publicDeparture(d, null, settings, today)]));
// Extra "today" dates that put seed departures inside the 45-day review and 7-day cutoff windows.
const extraTodays = ['2026-10-21', '2026-10-22', '2026-11-28', '2026-11-29', '2027-01-03', '2027-02-10'];
const extra = Object.fromEntries(extraTodays.map((t) => [t, Object.fromEntries(deps.map((d) => [d.id, { ...publicDeparture(d, null, settings, t), listed: isListed(d, t, settings) }]))]));
writeFileSync(new URL('./.parity.json', import.meta.url), JSON.stringify({ today, rows, extra }));
console.log(`parity fixtures: ${deps.length} (+${deps.length * extraTodays.length} at ${extraTodays.length} extra dates)`);
