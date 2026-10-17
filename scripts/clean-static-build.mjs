// Astro's prerender modules are build intermediates, not public static assets.
import fs from 'node:fs';
import path from 'node:path';

const generated = ['chunks', 'pages', '_noop-middleware.mjs', 'renderers.mjs',
  ...fs.readdirSync('dist').filter((name) => /^manifest_.*\.mjs$/.test(name))];
for (const name of generated) {
  if (fs.existsSync(path.join('public', name))) throw new Error(`Refusing to remove a public asset: ${name}`);
  fs.rmSync(path.join('dist', name), { recursive: true, force: true });
}
