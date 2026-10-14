// Post-build: CC BY / CC BY-SA attribution. For every built page that displays a
// CC-licensed image (per src/data/photoCredits.ts) without its credit already on the
// page, add a visible "Photos on this page" credit line above the site footer.
// Attribution-only: never changes, hides or removes an image.
import fs from 'node:fs';
import path from 'node:path';
const src = fs.readFileSync('src/data/photoCredits.ts', 'utf8');
const start = src.indexOf('= [', src.indexOf('PHOTO_CREDITS')) + 2;
const end = src.indexOf('\n];', start);
const credits = JSON.parse(src.slice(start, end + 2).replace(/,\s*\]$/, ']'));
const cc = credits.filter((c) => /^CC/i.test(c.license || '') && !/^CC0/i.test(c.license) && c.author);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []);
let pages = 0, added = 0;
for (const f of walk('dist')) {
  let html = fs.readFileSync(f, 'utf8');
  if (html.includes('class="page-photo-credits"')) continue;
  const need = cc.filter((c) => c.paths.some((p) => html.includes(p)) && !html.includes(esc(c.author)) && !html.includes(c.author));
  const uniq = [...new Map(need.map((c) => [c.author + c.source, c])).values()];
  if (!uniq.length) continue;
  const items = uniq.map((c) => `${c.source ? `<a href="${esc(c.source)}" rel="noopener" target="_blank">${esc(c.author)}</a>` : esc(c.author)}, ${c.licenseUrl ? `<a href="${esc(c.licenseUrl)}" rel="noopener license" target="_blank">${esc(c.license)}</a>` : esc(c.license)}`).join('; ');
  const block = `<aside class="page-photo-credits" style="max-width:1180px;margin:1.5rem auto 0;padding:0 1.25rem;font-size:.75rem;line-height:1.5;opacity:.8">Photos on this page: ${items}. Images cropped and resized.</aside>`;
  const i = html.lastIndexOf('<footer');
  html = i >= 0 ? html.slice(0, i) + block + html.slice(i) : html.replace('</body>', block + '</body>');
  fs.writeFileSync(f, html); pages++; added += uniq.length;
}
console.log(`photo credits: ${added} credits added on ${pages} pages`);
