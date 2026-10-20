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
  for (const path of ['/', '/tours/', '/contact/', '/attractions/ancient-city-of-balkh/', '/attractions/wardak-highlands/']) {
    await page.goto(path);
    await expect(page.locator('h1').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path).toBe(true);
    expect(await page.locator('a[href*="wa.me/93780123456"]').count()).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
});
