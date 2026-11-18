import { test, expect } from '@playwright/test';

test('unrelated flat-slug foods do not fill Qabeli Palaw recommendations', async ({ page }) => {
  await page.goto('/food-culture/kabuli-pulao/');
  await expect(page.getByRole('heading', { name: 'Related food & hospitality', exact: true })).toHaveCount(0);
  for (const title of ['Chicken Kabuli', 'Herat Baklava', 'Herat Ice Cream', 'Kandahar Sweets', 'Kulcha Cookie']) {
    await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
  }
  await page.goto('/food-culture/dried-fruits/dried-mulberries/');
  const related = page.locator('.related-food-section').filter({
    has: page.getByRole('heading', { name: 'Related food & hospitality', exact: true }),
  });
  await expect(related.getByRole('heading', { name: 'Green Tea', exact: true })).toHaveCount(1);
  await expect(related.getByRole('heading', { name: 'Walnuts', exact: true })).toHaveCount(1);
  await expect(related.locator('img[src="/assets/images/heroes/food-and-culture/hero.webp"]')).toHaveCount(0);
  for (const img of await related.locator('img').all()) {
    expect(await img.evaluate(async el => { el.loading = 'eager'; await el.decode(); return el.naturalWidth; })).toBeGreaterThan(0);
  }
});

test('Rosh opens a complete page with the owner hero and one platter photo; old URLs retain discovery', async ({ page }) => {
  await page.goto('/food-culture/');
  const card = page.locator('article.food-card').filter({ has: page.getByRole('heading', { name: 'Rosh (Rosht)', exact: true }) });
  await card.getByRole('link', { name: 'View food note' }).click();
  await expect(page).toHaveURL(/\/food-culture\/dishes\/rosh\/$/);
  await expect(page.getByRole('heading', { name: 'Rosh (Rosht)', level: 1 })).toBeVisible();
  await expect(page.locator('.food-detail-hero-image')).toHaveAttribute('src', '/assets/images/food/dishes/kandahari-rosh/owner-rosh.webp');
  await expect(page.locator('.food-gallery-grid img')).toHaveCount(1);
  await expect(page.locator('.food-gallery-grid img')).toHaveAttribute('src', '/assets/images/food/dishes/kandahari-rosh/rosh-james.webp');
  await expect(page.locator('.related-food-card').getByRole('heading', { name: 'Naan', exact: true })).toHaveCount(1);
  await page.locator('[data-food-image]').click();
  await expect(page.locator('#food-gallery-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#food-gallery-dialog')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const route of ['/food-culture/kandahar-rosht/', '/food-culture/dishes/kandahari-rosh/', '/cultural-experiences/culinary/kandahari-rosh/']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/food-culture\/#dishes$/);
    await expect(page.locator('article.food-card').filter({ has: page.getByRole('heading', { name: 'Rosh (Rosht)', exact: true }) }).getByRole('link', { name: 'View food note' })).toHaveAttribute('href', '/food-culture/dishes/rosh/');
  }
});
