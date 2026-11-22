import { test, expect } from '@playwright/test';

const card = (page, title) => page.locator('article.food-card').filter({
  has: page.getByRole('heading', { name: title, exact: true }),
});
const gallery = page => page.locator('.food-gallery-grid img');

test('regional harvests include one melon, one pistachio and the Afghan nut entries', async ({ page }) => {
  await page.goto('/food-culture/');
  // Owner 2026-11-20: Produce and Dried Fruits & Nuts are separate top-level sections.
  const harvests = page.locator('#produce');
  await expect(harvests.getByRole('heading', { name: 'Produce', exact: true })).toBeVisible();
  await expect(page.locator('section#dried-fruits')).toHaveCount(1);
  await expect(page.locator('#dried-fruits').getByRole('heading', { name: 'Dried Fruits & Nuts', exact: true })).toHaveCount(1);
  await expect(card(page, 'Melons')).toHaveCount(1);
  await expect(card(page, 'Pistachios')).toHaveCount(1);
  await expect(card(page, 'Almonds')).toContainText('Afghan-grown almonds');
  await expect(card(page, 'Pine Nuts')).toContainText('Afghanistan’s mountain forests');
  await expect(card(page, 'Dried Mulberries')).toContainText('Toot-e-khoshk');
  await expect(card(page, 'Dried Mulberries').locator('img')).toHaveAttribute('src', '/assets/images/food/dried-fruits/dried-mulberries/white-dried-mulberries.webp');
  await expect(page.getByText('Export Heritage', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Kunduz Melon', { exact: true })).toHaveCount(0);
  await expect(page.getByText('The Pistachio Forests of Badghis', { exact: true })).toHaveCount(0);
  await expect(page.getByText('The Gardens of Logar: Kabul’s Orchard Province', { exact: true })).toHaveCount(0);
  await expect(card(page, 'Afghan Grapes').locator('img')).toHaveAttribute('src', '/assets/images/food/produce/kandahar-grapes/owner-afghan-grapes.webp');
  await expect(page.locator('#dried-fruits .food-card > p').filter({ hasText: /^Bazaar$/ })).toHaveCount(0);

  const experiences = page.locator('.experience-card');
  // 14 earlier cards + Saffron Ice Cream of Herat (Sweet Streets of Mazar replaced the Mazar sweets card).
  await expect(experiences).toHaveCount(15);
  for (const img of await experiences.locator('img').all()) {
    expect(await img.evaluate(async el => { el.loading = 'eager'; await el.decode(); return el.naturalWidth; })).toBeGreaterThan(0);
  }
  const width = page.viewportSize().width;
  const columns = await page.locator('.experience-list').first().evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(columns).toBe(width > 1050 ? 3 : width > 620 ? 2 : 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('merged notes preserve their photos and old URLs lead to the consolidated pages', async ({ page }) => {
  await page.goto('/food-culture/produce/kunduz-melon/');
  await expect(page).toHaveURL(/\/food-culture\/produce\/balkh-melon\/$/);
  await expect(page.getByRole('heading', { name: 'Melons', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Kunduz Harvest', exact: true })).toHaveCount(1);
  const melonPhotos = await gallery(page).evaluateAll(imgs => imgs.map(img => img.getAttribute('src')));
  expect(melonPhotos).toEqual(expect.arrayContaining([
    '/assets/images/food/produce/balkh-melons/gallery-1.webp',
    '/assets/images/food/produce/kunduz-melon/hero.webp',
    '/assets/images/food/produce/kunduz-melon/gallery-1.webp',
  ]));

  await page.goto('/food-culture/dried-fruits/badghis-pistachios/');
  await expect(page).toHaveURL(/\/food-culture\/samangan-pistachios\/$/);
  await expect(page.getByRole('heading', { name: 'The Pistachio Forests of Badghis', exact: true })).toHaveCount(1);
  await expect(page.locator('img[src$="/pista-tree-badghis.webp"]')).toHaveCount(0);
  await expect(gallery(page)).toHaveCount(2);
  await expect(gallery(page).last()).toHaveAttribute('src', '/assets/images/food/dried-fruits/badghis-pistachios/pista-forest-gallery.webp');

  await page.goto('/food-culture/produce/kandahar-grapes/');
  await expect(page.locator('.food-detail-hero-image')).toHaveAttribute('src', '/assets/images/food/produce/kandahar-grapes/owner-afghan-grapes.webp');
  await expect(gallery(page)).toHaveAttribute('src', '/assets/images/food/produce/kandahar-grapes/hero.webp');
  await page.locator('[data-food-image]').first().click();
  await expect(page.locator('#food-gallery-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#food-gallery-dialog')).not.toBeVisible();
});

test('pine nuts describe Afghanistan and dried mulberries use the two owner photos', async ({ page }) => {
  await page.goto('/food-culture/dried-fruits/paktia-pine-nuts/');
  await expect(page.getByRole('heading', { name: 'Pine Nuts', exact: true })).toBeVisible();
  await expect(page.locator('#food-story')).toContainText('Paktia, Paktika, Khost, Kunar, and Nuristan');
  await page.goto('/food-culture/dried-fruits/dried-mulberries/');
  await expect(page.getByRole('heading', { name: 'Dried Mulberries', exact: true })).toBeVisible();
  await expect(page.locator('.food-detail-hero-image')).toHaveAttribute('src', '/assets/images/food/dried-fruits/dried-mulberries/white-dried-mulberries.webp');
  await expect(gallery(page)).toHaveAttribute('src', '/assets/images/food/dried-fruits/dried-mulberries/dark-dried-mulberries.webp');
  for (const img of await page.locator('.food-detail-hero-image, .food-gallery-grid img').all()) {
    expect(await img.evaluate(async el => { el.loading = 'eager'; await el.decode(); return el.naturalWidth; })).toBeGreaterThan(0);
  }
  await expect(page.locator('img[src*="central-valley-mulberries/hero.webp"]')).toHaveCount(0);
  await expect(page.locator('img:not([data-lightbox-image]):not([src]), img[src=""]')).toHaveCount(0);
});
