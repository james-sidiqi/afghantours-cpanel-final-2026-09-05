import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const aliasFile = path.join(root, 'src/data/imagePathAliases.json');
const aliases = fs.existsSync(aliasFile) ? JSON.parse(fs.readFileSync(aliasFile, 'utf8')) : {};
const files = [];
function walk(dir, built = false) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!['_inactive', 'node_modules', '.git'].includes(entry.name)) walk(file, built); }
    else if ((built ? /\.(html|css|js)$/i : /\.(astro|ts|js|md|csv|json)$/i).test(file)) files.push({ file, built });
  }
}
walk(path.join(root, 'src')); walk(path.join(root, 'data')); walk(path.join(root, 'dist'), true);
const refs = new Map();
const re = /\/assets\/images\/[^\s"'`)<>,}\\\]]+?\.(?:webp|png|jpe?g|gif|svg|avif)(?=[?\s"'`),<>\]}]|$)/gi;
for (const { file, built } of files) {
  for (const match of fs.readFileSync(file, 'utf8').matchAll(re)) {
    const ref = match[0].replace(/[.,;]+$/, '').split(';')[0];
    if (ref.includes('${')) continue;
    // Source metadata may retain aliases; browser URLs must exist without a resolver.
    const resolved = built ? ref : aliases[ref] || ref;
    const full = path.join(root, built ? 'dist' : 'public', resolved.replace(/^\//, ''));
    const key = `${built ? 'built' : 'source'}:${ref}`;
    if (!refs.has(key)) refs.set(key, { ref, resolved, full, from: [] });
    refs.get(key).from.push(path.relative(root, file));
  }
}
const missing = [...refs.values()].filter(item => !fs.existsSync(item.full)).map(({ ref, resolved, from }) => ({ ref, resolved, from: [...new Set(from)].slice(0, 5) }));
console.log(JSON.stringify({ total_refs: refs.size, missing_count: missing.length, missing }, null, 2));
