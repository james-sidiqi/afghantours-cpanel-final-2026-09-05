import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';

const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
let fixture;
try {
  const images = await server.ssrLoadModule('/src/lib/images.ts');
  const galleries = JSON.parse(fs.readFileSync('src/data/imageGalleryManifest.json', 'utf8'));
  const assets = JSON.parse(fs.readFileSync('src/data/imageAssetManifest.json', 'utf8'));
  const sample = assets.find((src) => src.endsWith('/hero.webp'));
  assert.ok(sample);
  fixture = fs.mkdtempSync(path.join(process.cwd(), 'public/assets/images/image-policy-test-'));
  const base = '/' + path.relative(path.join(process.cwd(), 'public'), fixture).split(path.sep).join('/');
  for (const name of ['hero.webp', 'thumb.webp', 'thumbnail-2.webp', 'card.webp', 'gallery-1.webp']) {
    fs.copyFileSync(path.join('public', sample), path.join(fixture, name));
  }
  const hero = `${base}/hero.webp`;
  const thumb = `${base}/thumb.webp`;
  assert.equal(images.getTourHeroImage({ hero_image: hero, thumbnail_image_path: thumb }), hero);
  assert.equal(images.getPreferredImage({ hero_image: hero, card_image: thumb, image_path: thumb }), hero);
  assert.equal(images.getTourHeroImage({ hero_image: '/missing.webp', thumbnail_image_path: thumb }), thumb);
  assert.equal(images.getTourHeroImage({ slug: 'weekend-in-kabul', thumbnail_image_path: thumb }), '/assets/images/tours/featured/weekend-in-kabul/hero.webp');
  assert.deepEqual(images.cleanGallery([hero, thumb, `${base}/thumbnail-2.webp`, `${base}/card.webp`, `${base}/gallery-1.webp`, hero, '/missing.webp']), [hero, `${base}/gallery-1.webp`]);
  assert.deepEqual(images.listGalleryImages(base), [], 'unlisted folder files must not leak into galleries');
  const [folder, entries] = Object.entries(galleries).find(([, list]) => list.length);
  const unlisted = path.join('public', folder, 'unlisted-policy-test.webp');
  try {
    fs.copyFileSync(path.join('public', sample), unlisted);
    assert.ok(!images.listGalleryImages(folder).includes(`${folder}/unlisted-policy-test.webp`));
  } finally { fs.rmSync(unlisted, { force: true }); }
  for (const [folder] of Object.entries(galleries)) {
    for (const src of images.listGalleryImages(folder)) assert.ok(images.isGalleryImage(src), src);
  }
  const rejected = await server.ssrLoadModule('/src/data/rejectedImages.ts');
  const bad = Object.keys(rejected).length; // Import also verifies the registry resolves without a cycle.
  console.log(JSON.stringify({ status: 'passed', hero_priority: true, canonical_tour_fallback: true, thumbnail_card_filter: true, explicit_inventory_isolation: true, gallery_folders_checked: Object.keys(galleries).length }));
} finally {
  if (fixture) fs.rmSync(fixture, { recursive: true, force: true });
  await server.close();
}
