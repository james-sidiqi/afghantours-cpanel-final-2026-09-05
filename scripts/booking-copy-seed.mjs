// postbuild: copy the booking seed into dist/booking/seed/ so the PHP runtime can import it
// on first run (web access to that folder is denied by .htaccess). Source of truth stays data/booking/.
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const src = path.resolve('data/booking');
const dest = path.resolve('dist/booking/seed');
await mkdir(dest, { recursive: true });
for (const f of ['tours-catalog.json', 'departures.json', 'blackouts.json', 'settings.json']) {
  await copyFile(path.join(src, f), path.join(dest, f));
}
await writeFile(path.join(dest, '.htaccess'), `# Booking seed (import source only) — never served.
<IfModule mod_authz_core.c>
  Require all denied
</IfModule>
<IfModule !mod_authz_core.c>
  Order allow,deny
  Deny from all
</IfModule>
`);
console.log('Copied booking seed to dist/booking/seed/');
