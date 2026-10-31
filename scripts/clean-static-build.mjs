// Astro's prerender modules are build intermediates, not public static assets.
import fs from 'node:fs';
import path from 'node:path';

const generated = ['chunks', 'pages', '_noop-middleware.mjs', 'renderers.mjs',
  ...fs.readdirSync('dist').filter((name) => /^manifest_.*\.mjs$/.test(name))];
for (const name of generated) {
  if (fs.existsSync(path.join('public', name))) throw new Error(`Refusing to remove a public asset: ${name}`);
  fs.rmSync(path.join('dist', name), { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

// Keep owner-retired redirects on the current host during isolated staging QA.
// Canonical SEO links stay absolute; only the navigation/refresh targets change.
const retired = JSON.parse(fs.readFileSync('data/retired_public_routes.json', 'utf8'));
for (const [from, to] of Object.entries(retired)) {
  const file = path.join('dist', from, 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  const absolute = 'https://afghantours.com' + to;
  if (!html.includes('http-equiv="refresh"') || (!html.includes(`content="0;url=${absolute}"`) && !html.includes(`content="0;url=${to}"`))) {
    throw new Error(`Unexpected retired redirect output: ${from}`);
  }
  fs.writeFileSync(file, html.replace(`content="0;url=${absolute}"`, `content="0;url=${to}"`)
    .replace(`rel="canonical" href="${to}"`, `rel="canonical" href="${absolute}"`)
    .replace(`<a href="${absolute}">`, `<a href="${to}">`));
}
