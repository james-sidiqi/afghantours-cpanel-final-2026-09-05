// Runs the built /contact/ page script against a URL query and prints the hidden-field values it sets (JSON).
// Usage: node contact-prefill.mjs "<query string>"
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const dist = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../dist');
const html = fs.readFileSync(path.join(dist, 'contact/index.html'), 'utf8');
const srcs = [...html.matchAll(/<script[^>]*src="(\/_astro\/[^"]+\.js)"/g)].map((m) => m[1]);
const els = {};
const el = (id) => (els[id] ||= { id, value: '', textContent: '', style: {}, dataset: {}, hidden: false, disabled: false,
  addEventListener() {}, setAttribute() {}, removeAttribute() {}, querySelector: () => null, querySelectorAll: () => [], classList: { add() {}, remove() {}, toggle() {} } });
const query = process.argv[2] || '';
const document = { getElementById: el, querySelector: () => null, querySelectorAll: () => [], addEventListener: (ev, fn) => { if (ev === 'DOMContentLoaded') fn(); }, readyState: 'complete' };
const window = { location: { search: '?' + query, href: 'https://afghantours.com/contact/?' + query, pathname: '/contact/' }, addEventListener() {} };
const ctx = vm.createContext({ document, window, location: window.location, URLSearchParams, URL, console, setTimeout, fetch: async () => ({}) });
for (const s of srcs) {
  const code = fs.readFileSync(path.join(dist, s), 'utf8').replace(/^\s*import[^;]+;/gm, '').replace(/^export\s*\{[^}]*\};?/gm, '');
  try { vm.runInContext(code, ctx); } catch (e) { /* other page scripts may need more DOM; ignore */ }
}
const pick = (id) => els[id]?.value ?? '';
console.log(JSON.stringify({ flow: pick('flowInput'), entity_type: pick('entityTypeInput'), entity_name: pick('entityNameInput'), entity_slug: pick('entitySlugInput'), interest: pick('interestInput') }));
