import { test, expect } from '@playwright/test';

test('Birding is the ninth activity beside Cycling in the main grid', async ({ page }) => {
  await page.goto('/activities/');
  const grids = page.locator('.act-list .act-grid');
  await expect(grids).toHaveCount(1);
  const cards = grids.locator('a.act-card');
  await expect(cards).toHaveCount(9);
  await expect(cards.nth(6).locator('h2')).toHaveText('Horse Riding');
  await expect(cards.nth(7).locator('h2')).toHaveText('Cycling');
  await expect(cards.nth(8).locator('h2')).toHaveText('Birding');
  await expect(page.getByText('Also available', { exact: true })).toHaveCount(0);
});

test('Haji Aziz uses the storefront as hero, card and gallery; Chainaki has no card image and no decorative-teapot photo', async ({ page }) => {
  const root = '/assets/images/experiences/culinary';
  await page.goto('/cultural-experiences/culinary/');
  const azizCard = page.locator('.culin-index-card[href="/cultural-experiences/culinary/aziz-bakery/"]');
  const chainakiCard = page.locator('.culin-index-card[href="/cultural-experiences/culinary/kabul-chainaki/"]');
  await expect(azizCard.locator('img')).toHaveAttribute('src', root + '/aziz-bakery/owner-haji-aziz-hero.webp');
  await expect(chainakiCard.locator('img')).toHaveCount(0);
  await page.goto('/cultural-experiences/culinary/aziz-bakery/');
  await expect(page.locator('.culin-hero-image')).toHaveAttribute('src', root + '/aziz-bakery/owner-haji-aziz-hero.webp');
  const azizGallery = page.locator('.culin-gallery img');
  await expect(azizGallery).toHaveCount(6);
  await expect(azizGallery.first()).toHaveAttribute('src', root + '/aziz-bakery/owner-haji-aziz-hero.webp');
  await expect(azizGallery.nth(1)).toHaveAttribute('src', root + '/aziz-bakery/gallery/owner-20261122-01-stacked-cookies.webp');
  await page.goto('/cultural-experiences/culinary/kabul-chainaki/');
  await expect(page.locator('.culin-hero-image')).toHaveAttribute('src', root + '/kabul-chainaki/gallery/02.webp');
  await expect(page.locator('.culin-gallery img')).toHaveCount(0);
  await expect(page.locator('img[src$="/kabul-chainaki/gallery/01.webp"]')).toHaveCount(0);
});
