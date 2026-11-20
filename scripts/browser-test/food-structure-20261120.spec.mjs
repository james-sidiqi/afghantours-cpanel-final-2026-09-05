import { test, expect } from '@playwright/test';

const DESSERTS = ['Halwa', 'Halwa Sona', 'Jalebi (Jelabi)', 'Firni', 'Sheer Birinj (Sheer Barinj)', 'Sheer Khorma',
  'Cake Sheeri (Milk Cake)', 'Gosh-e-Fil', 'Sheer Pira', 'Sheer Yakh'];

test('Food & Culture shows the owner-approved sections and exactly ten core desserts', async ({ page }) => {
  await page.goto('/food-culture/');
  for (const id of ['dishes', 'desserts', 'drinks', 'produce', 'dried-fruits', 'culinary-experiences', 'cultural-experiences']) {
    await expect(page.locator(`section#${id}`)).toHaveCount(1);
  }
  const core = page.locator('#desserts > .premium-grid > article.food-card');
  await expect(core).toHaveCount(10);
  await expect(core.locator('h3')).toHaveText(DESSERTS);
  await expect(page.locator('#desserts')).not.toContainText('Ghazni');
  await expect(page.locator('#desserts')).not.toContainText('Sweet Streets');
  await expect(page.locator('#desserts')).not.toContainText('Saffron Ice Cream');
  const sk = core.filter({ has: page.getByRole('heading', { name: 'Sheer Khorma', exact: true }) });
  await expect(sk.locator('img')).toHaveAttribute('src', '/assets/images/food/sweets/sheer-khurma/hero.webp');
  const cake = core.filter({ has: page.getByRole('heading', { name: 'Cake Sheeri (Milk Cake)', exact: true }) });
  await expect(cake.locator('.food-card__noimg--pending')).toContainText('Photograph pending');
  await expect(cake.locator('img')).toHaveCount(0);
  const culinary = page.locator('#culinary-experiences');
  await expect(culinary.locator('a[href="/cultural-experiences/culinary/sweet-streets-of-mazar/"]')).toHaveCount(1);
  await expect(culinary.locator('a[href="/cultural-experiences/culinary/saffron-ice-cream-of-herat/"]')).toHaveCount(1);
  await expect(page.locator('#dishes article.food-card').filter({ has: page.getByRole('heading', { name: 'Qorma-e Sabzi', exact: true }) })
    .getByRole('link')).toHaveAttribute('href', '/food-culture/dishes/qorma-e-sabzi/');
  await expect(page.locator('#dishes')).not.toContainText('Ouzi');
  for (const img of await page.locator('#desserts img, #drinks img').all()) {
    expect(await img.evaluate(async el => { el.loading = 'eager'; await el.decode(); return el.naturalWidth; })).toBeGreaterThan(0);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('owner food photographs render on their detail pages', async ({ page }) => {
  await page.goto('/food-culture/drinks/sheer-chai/');
  await expect(page.locator('.food-detail-hero-image')).toHaveAttribute('src', '/assets/images/food/drinks/sheer-chai/github-hero.webp');
  await expect(page.locator('.food-gallery-grid img')).toHaveCount(1);
  await expect(page.locator('.food-gallery-grid img')).toHaveAttribute('src', '/assets/images/food/drinks/sheer-chai/gallery-1.webp');
  await page.goto('/food-culture/dishes/shor-nakhut/');
  await expect(page.locator('.food-gallery-grid img[src="/assets/images/food/dishes/shor-nakhut/gallery-1.webp"]')).toHaveCount(1);
  await page.goto('/food-culture/dishes/dopiaza/');
  await expect(page.locator('.food-detail-hero-image')).toHaveAttribute('src', '/assets/images/food/dishes/dopiaza/hero.webp');
  await page.goto('/food-culture/desserts/cake-sheeri/');
  await expect(page.locator('.food-detail-hero-pending')).toContainText('Photograph pending');
  await expect(page.locator('.food-detail-hero-image')).toHaveCount(0);
});

test('retired dessert routes lead to their replacements', async ({ page }) => {
  await page.goto('/food-culture/desserts/ghazni-sheer-pira/');
  await expect(page).toHaveURL(/\/food-culture\/desserts\/sheer-pira\/$/);
  await page.goto('/food-culture/herat-ice-cream/');
  await expect(page).toHaveURL(/\/cultural-experiences\/culinary\/saffron-ice-cream-of-herat\/$/);
  await expect(page.getByRole('heading', { name: 'Saffron Ice Cream of Herat', level: 1 })).toBeVisible();
  await page.goto('/food-culture/desserts/sweet-streets-of-mazar/');
  await expect(page).toHaveURL(/\/cultural-experiences\/culinary\/sweet-streets-of-mazar\/$/);
  await page.goto('/restaurants/sweet-streets-of-mazar/');
  await expect(page).toHaveURL(/\/cultural-experiences\/culinary\/sweet-streets-of-mazar\/$/);
});
