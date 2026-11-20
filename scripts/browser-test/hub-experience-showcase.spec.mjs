import { test, expect } from '@playwright/test';

test('hub showcase uses category icons and linked experiences for Mazar and Kabul', async ({ page }) => {
  await page.goto('/hubs/');
  const columns = page.locator('.hub-access .access-column');
  await expect(columns).toHaveCount(4);
  await expect(columns.locator('.access-column-heading h3')).toHaveText([
    'Hotels',
    'Culinary Experiences',
    'Activities',
    'Cultural Experiences',
  ]);
  await expect(columns.locator('.access-column-heading .access-icon svg')).toHaveCount(4);
  await expect(page.locator('#hub-food, #hub-attractions')).toHaveCount(0);

  await page.locator('.hub-choice').filter({ hasText: 'Mazar-e-Sharif' }).click();
  const culinary = page.locator('#hub-culinary .access-card');
  await expect(culinary).toHaveCount(2);
  await expect(culinary.first()).toContainText('Mansoor Kabob');
  await expect(culinary.first()).toHaveAttribute('href', '/cultural-experiences/culinary/mansoor-kabob/');
  await expect(culinary.nth(1)).toContainText('Sweet Streets of Mazar');
  await expect(culinary.nth(1)).toHaveAttribute('href', '/cultural-experiences/culinary/sweet-streets-of-mazar/');

  const cultural = page.locator('#hub-cultural .access-card');
  await expect(cultural).toHaveCount(2);
  await expect(cultural.nth(0)).toContainText('Buzkashi');
  await expect(cultural.nth(0)).toHaveAttribute('href', '/cultural-experiences/buzkashi/');
  await expect(cultural.nth(1)).toContainText('Ancient City of Balkh');
  await expect(cultural.nth(1)).toHaveAttribute('href', '/cultural-experiences/ancient-city-of-balkh/');
  await expect(page.locator('#hub-activities .activity-card').first()).toContainText('Fishing');

  for (const photo of await page.locator('#hub-culinary img, #hub-cultural img').all()) {
    expect(await photo.evaluate(async img => {
      img.loading = 'eager';
      await img.decode();
      return img.naturalWidth;
    })).toBeGreaterThan(0);
  }

  await page.locator('.hub-choice').filter({ hasText: 'Kabul' }).first().click();
  await expect(page.locator('#hub-culinary')).toContainText('Traditional Chainaki in Kabul');
  await expect(page.locator('#hub-cultural')).toContainText('The Living Clay of Istalif');
  await expect(page.locator('.hub-access')).not.toContainText('Qabuli Palaw');
});
