import fs from 'node:fs';
import path from 'node:path';

const routes = JSON.parse(fs.readFileSync('data/retired_public_routes.json', 'utf8'));
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const markerStart = '# BEGIN OWNER-RETIRED-ROUTES';
const markerEnd = '# END OWNER-RETIRED-ROUTES';
const block = [markerStart, '<IfModule mod_rewrite.c>', 'RewriteEngine On',
  ...Object.entries(routes).map(([from, to]) => {
    if (!/^\/[a-z0-9/-]+\/$/.test(from) || !/^\/[a-z0-9/#-]+$/.test(to) || routes[to]) {
      throw new Error(`Invalid or chained retired route: ${from} -> ${to}`);
    }
    return `RewriteRule ^${escapeRegex(from.slice(1, -1))}/?$ ${to} [R=301,L,NE]`;
  }), '</IfModule>', markerEnd].join('\n');
const htPath = 'public/.htaccess';
const current = fs.readFileSync(htPath, 'utf8');
const existing = new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}`);
if (process.argv.includes('--write')) {
  fs.writeFileSync(htPath, existing.test(current) ? current.replace(existing, block) : current.trimEnd() + '\n\n' + block + '\n');
  console.log('Synchronized source-only retired-route rules. Live .htaccess was not changed.');
  process.exit(0);
}
if (!current.includes(block)) throw new Error('Retired-route rules drifted. Run node scripts/audit-retired-routes.mjs --write');
const sitemap = fs.readFileSync('dist/sitemap.xml', 'utf8');
const mapAttractions = JSON.parse(fs.readFileSync('dist/data/maps/afghanToursAttractions.json', 'utf8'));
for (const item of mapAttractions) {
  if (routes[`/attractions/${item.slug}/`]) throw new Error(`Retired attraction still appears on the interactive map: ${item.slug}`);
}
for (const [from, to] of Object.entries(routes)) {
  const html = fs.readFileSync(path.join('dist', from, 'index.html'), 'utf8');
  if (!html.includes(`content="0;url=${to}"`)) throw new Error(`Not a host-relative redirect stub: ${from}`);
  if (!html.includes(`rel="canonical" href="https://afghantours.com${to}"`) || !html.includes(`<a href="${to}">`)) {
    throw new Error(`Redirect canonical/fallback link drifted: ${from}`);
  }
  if (sitemap.includes(`<loc>https://afghantours.com${from}</loc>`)) throw new Error(`Retired page in sitemap: ${from}`);
  const [pathname, hash] = to.split('#');
  const target = fs.readFileSync(path.join('dist', pathname, 'index.html'), 'utf8');
  if (hash && !target.includes(`id="${hash}"`)) throw new Error(`Missing target anchor: ${to}`);
}
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
for (const file of walk('dist').filter(f => f.endsWith('.html'))) {
  const html = fs.readFileSync(file, 'utf8');
  if (/http-equiv=["']refresh["']/i.test(html)) continue;
  for (const from of Object.keys(routes)) {
    if (html.includes(`href="${from}"`)) throw new Error(`Public page still links to retired route ${from}: ${file}`);
  }
  if (/\/assets\/images\/food\/produce\/farah-waterm(?:elon|ellons)\//.test(html)) {
    throw new Error(`Rejected watermelon imagery still rendered: ${file}`);
  }
}
console.log(`Retired routes: ${Object.keys(routes).length} redirects verified; no retired sitemap entries, public links or rejected watermelon images.`);
