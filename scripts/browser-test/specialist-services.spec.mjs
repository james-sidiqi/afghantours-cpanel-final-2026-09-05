import { test, expect } from '@playwright/test';

const mergedName = 'Photography, Documentary & Media Support';
const mergedPath = '/specialist-services/photography-documentary/';

test('photography and media have one service with working legacy links and inquiry context', async ({ page }) => {
  await page.goto('/specialist-services/');
  const merged = page.locator('.svc-card').filter({ has: page.getByRole('heading', { name: mergedName, exact: true }) });
  await expect(merged).toHaveCount(1);
  await expect(merged).toContainText('journalists and media teams');
  await expect(page.locator('.svc-card[href="/specialist-services/media-journalist/"]')).toHaveCount(0);
  await merged.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(mergedName);
  for (const text of ['photography objectives', 'fixers', 'translators', 'reporting deadlines']) {
    await expect(page.locator('article.sp')).toContainText(text);
  }
  const cta = page.locator('.sp-hero a').first();
  const params = new URL(await cta.getAttribute('href'), 'https://afghantours.com').searchParams;
  expect(params.get('flow')).toBe('specialist');
  expect(params.get('entity_code')).toBe('PHOT');
  expect(params.get('entity_name')).toBe(mergedName);
  for (const route of ['/specialist-services/media-journalist/', '/tours/media-support/']) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(mergedPath + '$'));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(mergedName);
  }
  await page.goto('/tours/');
  await expect(page.locator('#custom-specialist a[href="' + mergedPath + '"]')).toHaveCount(1);
});

test('Return Journeys card covers diaspora and veterans and opens the existing two options', async ({ page }) => {
  await page.goto('/specialist-services/');
  const card = page.locator('.svc-card[href="/return-journeys/"]');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Diaspora & Veterans');
  await expect(card).toContainText('contractors and diplomats');
  expect(await card.locator('img').evaluate(async el => { el.loading = 'eager'; await el.decode(); return el.naturalWidth; })).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await card.click();
  await expect(page).toHaveURL(/\/return-journeys\/$/);
  await expect(page.locator('.rj-card')).toHaveCount(2);
  for (const [slug, code, title] of [
    ['diaspora', 'DIAS', 'Diaspora & Heritage Return'],
    ['veterans-contractors-diplomats', 'VETS', 'Veterans, Contractors & Diplomats'],
  ]) {
    await page.goto('/return-journeys/');
    await page.locator('.rj-card[href="/return-journeys/' + slug + '/"]').click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    const href = await page.locator('.rj-hero a.btn-primary').getAttribute('href');
    const params = new URL(href, 'https://afghantours.com').searchParams;
    expect(params.get('flow')).toBe('return');
    expect(params.get('entity_code')).toBe(code);
  }
});
