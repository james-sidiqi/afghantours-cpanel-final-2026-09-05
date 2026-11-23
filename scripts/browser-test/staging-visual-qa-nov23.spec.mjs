import { test, expect } from '@playwright/test';

test('Specialist Services displays a real Kabul city hero', async ({ page }) => {
  await page.goto('/specialist-services/');
  const hero = page.locator('.svc-hero');
  await expect(hero).toBeVisible();
  const background = await hero.evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(background).toContain('/assets/images/heroes/hubs/hero.webp');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Specialist support');
});

test('Travel Hubs banner matches the selected hub card including Herat', async ({ page }) => {
  await page.goto('/hubs/');
  const firstCard = page.locator('.hub-choice').first();
  await expect(page.locator('.hub-bg-image.is-active')).toHaveAttribute('src', await firstCard.locator('img').getAttribute('src'));
  const herat = page.locator('.hub-choice').filter({ hasText: 'Herat City' });
  await herat.click();
  const cardSrc = await herat.locator('img').getAttribute('src');
  await expect(page.locator('.hub-bg-image.is-active')).toHaveAttribute('src', cardSrc);
  await expect(page.locator('#hub-main-image')).toHaveAttribute('src', cardSrc);
});

test('Fishing gallery restores the missing existing river photo and opens on tap', async ({ page }) => {
  await page.goto('/activities/fishing/');
  const photos = page.locator('.act-gallery .gal-photo');
  await expect(photos).toHaveCount(2);
  await expect(page.locator('.act-gallery img[src$="/fishing/gallery/02.webp"]')).toHaveCount(1);
  await photos.first().click();
  await expect(page.locator('[data-image-lightbox]')).toHaveAttribute('aria-hidden', 'false');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-image-lightbox]')).toHaveAttribute('aria-hidden', 'true');
});

test('Shopping and Hiking images can be enlarged from accessible buttons', async ({ page }) => {
  for (const activity of ['shopping', 'hiking']) {
    await page.goto('/activities/' + activity + '/');
    const gallery = page.locator('.act-gallery .gal-photo');
    expect(await gallery.count()).toBeGreaterThan(0);
    await gallery.first().focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-image-lightbox]')).toHaveAttribute('aria-hidden', 'false');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-image-lightbox]')).toHaveAttribute('aria-hidden', 'true');
  }
});

test('Shopping loads the existing Majid Mall photo instead of leaving an empty gap', async ({ page }) => {
  await page.goto('/activities/shopping/');
  const photo = page.locator('.act-gallery img[src$="/shopping/gallery/majid-mall.webp"]');
  await expect(photo).toHaveCount(1);
  await expect(photo).toHaveAttribute('loading', 'eager');
  const naturalWidth = await photo.evaluate(async img => { await img.decode(); return img.naturalWidth; });
  expect(naturalWidth).toBeGreaterThan(0);
});

test('Skiing gallery has one version of the duplicate raised-poles photo', async ({ page }) => {
  await page.goto('/activities/skiing/');
  const photos = page.locator('.act-gallery .gal-photo');
  await expect(photos).toHaveCount(6);
  await expect(page.locator('.act-gallery img[src$="/page-assets/activities/skiing/02.webp"]')).toHaveCount(0);
  await expect(page.locator('.act-gallery img[src$="/experiences/activities/skiing/gallery/03.webp"]')).toHaveCount(1);
});
