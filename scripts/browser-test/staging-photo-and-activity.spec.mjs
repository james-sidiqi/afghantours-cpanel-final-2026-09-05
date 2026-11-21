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

test('Chainaki and Haji Aziz use approved card/hero images without duplicated Chainaki gallery', async ({ page }) => {
  const root = '/assets/images/experiences/culinary';
  await page.goto('/cultural-experiences/culinary/');
  const azizCard = page.locator('.culin-index-card[href="/cultural-experiences/culinary/aziz-bakery/"]');
  const chainakiCard = page.locator('.culin-index-card[href="/cultural-experiences/culinary/kabul-chainaki/"]');
  await expect(azizCard.locator('img')).toHaveAttribute('src', root + '/aziz-bakery/owner-haji-aziz-hero.webp');
  await expect(chainakiCard.locator('img')).toHaveAttribute('src', root + '/kabul-chainaki/gallery/01.webp');
  await page.goto('/cultural-experiences/culinary/aziz-bakery/');
  await expect(page.locator('.culin-hero-image')).toHaveAttribute('src', root + '/aziz-bakery/owner-haji-aziz-hero.webp');
  await page.goto('/cultural-experiences/culinary/kabul-chainaki/');
  await expect(page.locator('.culin-hero-image')).toHaveAttribute('src', root + '/kabul-chainaki/gallery/01.webp');
  const gallery = page.locator('.culin-gallery img');
  await expect(gallery).toHaveCount(1);
  await expect(gallery.first()).toHaveAttribute('src', root + '/kabul-chainaki/gallery/02.webp');
});
