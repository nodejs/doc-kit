import { expect, test } from '@playwright/test';

for (const theme of ['light', 'dark']) {
  test(`type links use the same color in the ${theme} theme`, async ({
    page,
  }) => {
    await page.addInitScript(
      theme => localStorage.setItem('theme', theme),
      theme
    );
    await page.goto('/assert.html');

    const colors = [];

    for (const name of ['WeakSet', 'Promise']) {
      const link = page
        .locator('code.type .type-link')
        .filter({
          hasText: new RegExp(`^${name}$`),
        })
        .first();

      await expect(link).toBeVisible();

      const color = await link.evaluate(
        element => getComputedStyle(element).color
      );

      for (const span of await link.locator('span').all()) {
        await expect(span).toHaveCSS('color', color);
      }

      colors.push(color);
    }

    expect(colors[0]).toBe(colors[1]);
  });
}
