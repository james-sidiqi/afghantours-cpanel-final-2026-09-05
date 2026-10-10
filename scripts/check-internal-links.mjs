// Internal link check over the built site: every same-site href/src in dist/**/*.html must resolve
// to a built file/page or to a 301 rule in dist/.htaccess. Exit 1 on any broken link.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
const DIST = path.resolve('dist');
const walk = (d) => readdirSync(d).flatMap((f) => { const p = path.join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(DIST);
const htaccess = existsSync(path.join(DIST, '.htaccess')) ? readFileSync(path.join(DIST, '.htaccess'), 'utf8') : '';
const rules = [...htaccess.matchAll(/^\s*RewriteRule\s+(\S+)\s+\S+\s+\[[^\]]*R=30[12]/gm)].map((m) => new RegExp(m[1]));
const resolves = (u) => {
  let p = decodeURIComponent(u.split('#')[0].split('?')[0]);
  if (!p || p === '/') return true;
  if (/^\/(booking|manage)\//.test(p) || p.endsWith('.php')) return existsSync(path.join(DIST, p.endsWith('/') ? p + 'index.php' : p)) || existsSync(path.join(DIST, p));
  const f = path.join(DIST, p);
  if (existsSync(f) && statSync(f).isFile()) return true;
  if (existsSync(path.join(f, 'index.html'))) return true;
  return rules.some((re) => re.test(p.replace(/^\//, '')));
};
let checked = 0; const broken = new Map();
for (const file of files.filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(/\s(?:href|src)=["'](\/(?!\/)[^"'\s>]*)["']/g)) {
    checked++;
    if (!resolves(m[1])) { const k = m[1]; if (!broken.has(k)) broken.set(k, new Set()); broken.get(k).add(path.relative(DIST, file)); }
  }
}
for (const [u, from] of broken) console.log(`BROKEN ${u}  ← ${[...from].slice(0, 3).join(', ')}${from.size > 3 ? ` (+${from.size - 3})` : ''}`);
console.log(`internal links: ${checked} checked, ${broken.size} broken targets`);
process.exit(broken.size ? 1 : 0);
