import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import { readFileSync } from 'node:fs';

const retiredRoutes = JSON.parse(readFileSync(new URL('./data/retired_public_routes.json', import.meta.url), 'utf8'));

export default defineConfig({
  output: 'static',
  integrations: [tailwind({ applyBaseStyles: false })],
  redirects: retiredRoutes,
  site: 'https://afghantours.com'
});
