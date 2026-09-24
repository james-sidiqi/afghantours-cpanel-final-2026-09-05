import { readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const site = 'https://afghantours.com';

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const files = await walk(root);
const urls = [];
for (const file of files) {
  if (!file.endsWith('.html')) continue;
  const relative = path.relative(root, file).split(path.sep).join('/');
  if (relative === '404.html' || relative.startsWith('_')) continue;
  let pathname;
  if (relative === 'index.html') pathname = '/';
  else if (relative.endsWith('/index.html')) pathname = '/' + relative.slice(0, -'index.html'.length);
  else pathname = '/' + relative.replace(/\.html$/, '/');
  if (pathname.includes('/_inactive/')) continue;
  const s = await stat(file);
  urls.push({ loc: `${site}${pathname}`, lastmod: s.mtime.toISOString().slice(0, 10) });
}
urls.sort((a, b) => a.loc.localeCompare(b.loc));
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${esc(u.loc)}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`;
await writeFile(path.join(root, 'sitemap.xml'), xml, 'utf8');
console.log(`Generated sitemap.xml with ${urls.length} URLs`);
