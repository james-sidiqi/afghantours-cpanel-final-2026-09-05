import { test, expect } from '@playwright/test';

// All submissions are mocked: these tests cannot send mail or alter live bookings.
test.beforeEach(async ({ page }) => {
  await page.route('**/booking/departures.php*', route => route.fulfill({ status: 503, body: '{}' }));
  await page.route('**/tour-inquiry.php', route => route.fulfill({ status: 500, body: '{}' }));
});

for (const kind of ['contact', 'tour']) {
  test(`${kind}: failures preserve input; explicit success displays reference`, async ({ page }) => {
    await page.goto(kind === 'contact' ? '/contact/' : '/tours/weekend-in-kabul/');
    if (kind === 'tour') await page.locator('a[href*="/contact/"][href*="entity_slug=weekend-in-kabul"]').first().click();
    const form = page.locator(kind === 'contact' ? '#contactInquiryForm' : '[data-tour-inquiry-form]');
    await expect(form).toBeVisible();
    // Contact uses hidden; the shared tour dialog already positions it offscreen.
    await expect(form.locator('[name="website"]')).not.toBeInViewport();
    await form.locator('[name="name"]').fill('Release QA');
    await form.locator('[name="email"]').fill('qa@example.com');
    const status = kind === 'contact' ? page.locator('#contactFormStatus') : form.locator('[data-inquiry-status]');
    for (const [body, contentType] of [['<html>Host error</html>', 'text/html'], ['{}', 'application/json']]) {
      await page.route('**/tour-inquiry.php', route => route.fulfill({ status: 200, body, contentType }));
      await form.locator('button[type="submit"]').click();
      await expect(status).toContainText('could not confirm receipt');
      await expect(form.locator('[name="name"]')).toHaveValue('Release QA');
      await expect(form.locator('button[type="submit"]')).toBeEnabled();
    }
    await page.route('**/tour-inquiry.php', route => route.fulfill({ json: { ok: true, message: 'Request received.', reference: 'AT-2026-12345' } }));
    await form.locator('button[type="submit"]').click();
    await expect(status).toContainText('Reference: AT-2026-12345');
    await expect(form.locator('[name="name"]')).toHaveValue('');
    await expect(form).toBeVisible();
  });
}

test('tour dialog traps focus and Escape restores the opener', async ({ page }) => {
  await page.goto('/tours/weekend-in-kabul/');
  const opener = page.locator('a[href*="/contact/"][href*="entity_slug=weekend-in-kabul"]').first();
  await opener.click();
  const panel = page.locator('[data-tour-inquiry-modal] [role="dialog"]');
  await expect(panel).toBeVisible();
  await expect(panel.locator('[name="name"]')).toBeFocused();
  const close = panel.getByRole('button', { name: 'Close inquiry form', exact: true });
  await close.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(panel.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test('featured booking labels and Weekend options match the catalog', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-featured-section]')).toContainText('Scheduled Departure · Private Tour');
  await page.locator('[data-featured-select]').filter({ hasText: 'Weekend in Kabul' }).click();
  await page.locator('[data-featured-panel].is-active [data-featured-open]').click();
  await page.locator('[data-featured-modal-contact]').click();
  const form = page.locator('[data-tour-inquiry-form]');
  await expect(form).toBeVisible();
  await expect(form.locator('[data-inquiry-arrival-row]')).toBeVisible();
  await expect(form.locator('[data-inquiry-extras-row]')).toBeVisible();
});

test('key pages have no horizontal overflow or JavaScript exceptions', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const path of ['/', '/tours/', '/contact/', '/food-culture/', '/cultural-experiences/culinary/', '/attractions/ancient-city-of-balkh/', '/attractions/wardak-highlands/']) {
    await page.goto(path);
    await expect(page.locator('h1').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path).toBe(true);
    expect(await page.locator('a[href*="wa.me/93780123456"]').count()).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
});

test('legacy specialist and return inquiries preserve their context', async ({ page }) => {
  for (const item of [
    { query: 'flow=specialist&serviceSlug=photography-documentary&serviceCode=PHOT&tourName=Photography+Support', flow: 'specialist', slug: 'photography-documentary', code: 'PHOT', name: 'Photography Support' },
    { query: 'flow=return&returnSlug=diaspora&tourCode=DIAS&tourName=Diaspora+Return', flow: 'return', slug: 'diaspora', code: 'DIAS', name: 'Diaspora Return' },
    { query: 'flow=specialist&entity_type=specialist&entity_slug=scientific-research&entity_code=SCIE&entity_name=Research&serviceSlug=wrong&serviceCode=wrong&tourName=wrong', flow: 'specialist', slug: 'scientific-research', code: 'SCIE', name: 'Research' },
  ]) {
    await page.goto('/contact/?' + item.query);
    const form = page.locator('#contactInquiryForm');
    for (const [field, value] of Object.entries({ flow: item.flow, entity_slug: item.slug, entity_code: item.code, entity_name: item.name })) {
      await expect(form.locator(`[name="${field}"]`)).toHaveValue(value);
    }
  }
});

test('culinary, cultural and food CTAs retain identity and reservation flow', async ({ page }) => {
  for (const item of [
    { path: '/cultural-experiences/culinary/aziz-bakery/', type: 'culinary-experience', slug: 'aziz-bakery', code: 'CUL-KBL-AZZ', selector: 'a.hero-secondary' },
    { path: '/cultural-experiences/istalif-pottery/', type: 'cultural-experience', slug: 'istalif-pottery', code: '', selector: 'a.hero-secondary' },
    { path: '/food-culture/kabuli-pulao/', type: 'food', slug: 'kabuli-pulao', code: '', selector: 'a.food-hero-secondary' },
  ]) {
    await page.goto(item.path);
    const title = await page.locator('h1').first().innerText();
    await page.locator(item.selector).first().click();
    const form = page.locator('#contactInquiryForm');
    await expect(form.locator('[name="flow"]')).toHaveValue('activity');
    await expect(form.locator('[name="entity_type"]')).toHaveValue(item.type);
    await expect(form.locator('[name="entity_code"]')).toHaveValue(item.code);
    await expect(form.locator('[name="entity_slug"]')).toHaveValue(item.slug);
    await expect(form.locator('[name="entity_name"]')).toHaveValue(title);
  }
});

test('navigation works on light pages with touch/click and Escape', async ({ page }) => {
  await page.goto('/food-culture/');
  const header = page.locator('[data-site-header]');
  expect(await header.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
  const mobile = page.viewportSize().width < 1024;
  if (mobile) await page.locator('[data-menu-toggle]').click();
  const group = page.locator('[data-nav-group]').filter({ has: page.locator('#site-dd-explore') });
  const trigger = group.locator('[data-nav-trigger]');
  await trigger.click();
  await expect(group.getByRole('link', { name: 'Culinary Experiences', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  if (mobile) {
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-menu-toggle]')).toHaveAttribute('aria-expanded', 'false');
  }
});

test('retired regional food URLs lead to the consolidated dishes section', async ({ page }) => {
  await page.goto('/food-culture/dishes/kabul-kabob/');
  await expect(page).toHaveURL(/\/food-culture\/#dishes$/);
  await expect(page.getByRole('heading', { name: 'Afghan Kabob', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Qabeli Palaw', exact: true })).toBeVisible();
});

test('Baghlan directory card and popup load their existing image', async ({ page }) => {
  await page.goto('/destinations/');
  const card = page.locator('[data-province-slug="baghlan"]');
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator('img')).toBeVisible();
  await expect.poll(() => card.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await card.click();
  await expect(page.locator('#province-modal-title')).toHaveText('Baghlan');
  await expect.poll(() => page.locator('#province-modal-image').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
});
