import { expect, test } from '@playwright/test';

test('renders stability tooltips outside the MetaBar scroll container', async ({
  page,
}) => {
  await page.goto('/assert.html');

  const badge = page.getByLabel('Stability: Legacy').first();
  await badge.scrollIntoViewIfNeeded();
  await expect(badge.locator('xpath=ancestor::is-land[1]')).toHaveAttribute(
    'ready',
    ''
  );
  await badge.hover();

  const tooltip = page.getByRole('tooltip').filter({ hasText: 'Legacy' });
  await expect(tooltip).toBeVisible();

  expect(await tooltip.evaluate(element => element.closest('aside dl'))).toBe(
    null
  );

  const box = await tooltip.boundingBox();
  const viewport = page.viewportSize();

  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);

  await page.mouse.move(0, 0);
  await expect(tooltip).not.toBeVisible();
  await badge.focus();
  await expect(tooltip).toBeVisible();
});
