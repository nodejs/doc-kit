import { expect, test } from '@playwright/test';

const REMOTE_CONFIG_URL = 'https://nodejs.org/site.json';

/**
 * The theme applied to the document root.
 *
 * @param {import('@playwright/test').Page} page
 */
const currentTheme = page =>
  page.evaluate(() => document.documentElement.getAttribute('data-theme'));

/**
 * Resolves after every pending passive effect has been applied, so a theme
 * that a press should not have changed can be asserted without a grace
 * period: had the press gone through, the flip would land by then.
 *
 * @param {import('@playwright/test').Page} page
 */
const afterEffectsSettle = page =>
  page.evaluate(
    () =>
      new Promise(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      )
  );

test.describe('Theme shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(REMOTE_CONFIG_URL, route =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ websiteBanners: {} }),
      })
    );

    await page.goto('/assert.html');

    // The shortcuts arrive with the ThemeToggle island's effects, which can
    // settle after the island is marked ready, so the first press of a test
    // is retried until it takes hold (a press before that is simply lost).
    await expect(
      page.locator('is-land[data-island-name="ThemeToggle"][ready]')
    ).toBeAttached();
  });

  test('switches themes and persists the choice', async ({ page }) => {
    await expect
      .poll(async () => {
        await page.keyboard.press('Meta+d');
        return currentTheme(page);
      })
      .toBe('dark');
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe(
      'dark'
    );

    await page.keyboard.press('Meta+l');
    await expect.poll(() => currentTheme(page)).toBe('light');
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe(
      'light'
    );
  });

  test('accepts Ctrl in place of Meta', async ({ page }) => {
    await expect
      .poll(async () => {
        await page.keyboard.press('Control+l');
        return currentTheme(page);
      })
      .toBe('light');

    await page.keyboard.press('Control+d');
    await expect.poll(() => currentTheme(page)).toBe('dark');
  });

  test('ignores presses without or with extra modifiers', async ({ page }) => {
    await expect
      .poll(async () => {
        await page.keyboard.press('Meta+d');
        return currentTheme(page);
      })
      .toBe('dark');

    // The listener just handled the press above, so these would switch the
    // theme back if they were not filtered out
    await page.keyboard.press('l');
    await page.keyboard.press('Meta+Shift+d');
    await afterEffectsSettle(page);
    expect(await currentTheme(page)).toBe('dark');
  });

  test('labels the shortcuts in the dropdown menu', async ({ page }) => {
    await page.getByLabel('Select theme').click();

    await expect(page.getByRole('menuitem')).toHaveText([
      'System',
      'Light ⌘+L',
      'Dark ⌘+D',
    ]);
  });
});
