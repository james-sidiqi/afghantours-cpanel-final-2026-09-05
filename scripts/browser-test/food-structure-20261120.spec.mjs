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
  // Owner 2026-11-21: the Turkish Bakery & Cafe cup photo was withdrawn; no verified replacement yet.
  await expect(sk.locator('.food-card__noimg--pending')).toContainText('Photograph pending');
  await expect(sk.locator('img')).toHaveCount(0);
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

test('Sheer Khorma detail page shows Photograph pending, not the withdrawn cafe photo', async ({ page }) => {
  await page.goto('/food-culture/desserts/sheer-khorma/');
  await expect(page.locator('.food-detail-hero-pending')).toContainText('Photograph pending');
  await expect(page.locator('img[src*="sheer-khurma"]')).toHaveCount(0);
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

test('owner dessert photographs (20 Nov package) render on cards and detail pages', async ({ page }) => {
  const S = '/assets/images/food/sweets';
  const cases = [
    ['halwa', '/assets/images/food/dishes/halwa/hero.webp', [`${S}/halwa/gallery-owner-20261120.webp`]],
    ['halwa-sona', `${S}/halwa-sona/hero-owner-20261120.webp`, [`${S}/halwa-sona/gallery-owner-20261120.webp`]],
    ['sheer-birinj', `${S}/sheer-birinj/hero-owner-20261120.webp`, []],
    ['sheer-pira', `${S}/sheer-pira/hero-owner-20261120.webp`, [`${S}/sheer-pira/gallery-owner-20261120.webp`]],
  ];
  for (const [slug, hero, gallery] of cases) {
    await page.goto(`/food-culture/desserts/${slug}/`);
    await expect(page.locator('.food-detail-hero-pending')).toHaveCount(0);
    const heroImg = page.locator('.food-detail-hero-image');
    await expect(heroImg).toHaveAttribute('src', hero);
    expect(await heroImg.evaluate(async el => { await el.decode(); return el.naturalWidth; })).toBeGreaterThan(0);
    const g = page.locator('.food-gallery-grid img');
    await expect(g).toHaveCount(gallery.length);
    for (const [i, src] of gallery.entries()) {
      await expect(g.nth(i)).toHaveAttribute('src', src);
      await expect(g.nth(i)).not.toHaveAttribute('alt', /image \d+$/);
      expect(await g.nth(i).evaluate(async el => { el.loading = 'eager'; await el.decode(); return el.naturalWidth; })).toBeGreaterThan(0);
    }
    await expect(page.locator('img[src*="hero-ai-recreation"]')).toHaveCount(0);
  }
  await page.goto('/food-culture/');
  const core = page.locator('#desserts > .premium-grid > article.food-card');
  for (const [title, src] of [['Halwa Sona', `${S}/halwa-sona/hero-owner-20261120.webp`], ['Sheer Birinj (Sheer Barinj)', `${S}/sheer-birinj/hero-owner-20261120.webp`], ['Sheer Pira', `${S}/sheer-pira/hero-owner-20261120.webp`]]) {
    const card = core.filter({ has: page.getByRole('heading', { name: title, exact: true }) });
    await expect(card.locator('img')).toHaveAttribute('src', src);
    await expect(card.locator('.food-card__noimg--pending')).toHaveCount(0);
  }
});
