import { expect, test } from '@playwright/test';

// The footer of the page under test is a button that hydrates on its first
// click (`interaction: true`), so that click starts it loading and is replayed
// once it's ready.
const ISLAND = 'is-land[data-island-name="PressButton"]';

test.describe('Press replay', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/assert.html');
  });

  for (const key of ['Enter', 'Space']) {
    test(`runs the action of a first press of ${key}`, async ({ page }) => {
      const button = page.locator(`${ISLAND} button`);

      // Focusing the button doesn't load it, only clicking does
      await button.focus();
      await expect(page.locator(ISLAND)).not.toHaveAttribute('ready');

      await page.keyboard.press(key);

      await expect(button).toHaveText('Presses: 1');
    });
  }

  test('runs the action of a first click', async ({ page }) => {
    const button = page.locator(`${ISLAND} button`);

    await button.click();

    await expect(button).toHaveText('Presses: 1');
  });
});
