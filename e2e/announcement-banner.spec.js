import { expect, test } from '@playwright/test';

const REMOTE_CONFIG_URL = 'https://nodejs.org/site.json';

test.describe('Announcement Banner', () => {
  test('renders a text-only banner', async ({ page }) => {
    await page.route(REMOTE_CONFIG_URL, route =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          websiteBanners: {
            index: { text: 'Important announcement for all users' },
          },
        }),
      })
    );

    await page.goto('/assert.html');

    const banner = page.getByRole('region', { name: 'Announcement' });
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Important announcement for all users');
    await expect(
      banner.getByRole('button', { name: 'Close banner' })
    ).toBeVisible();
  });

  test('renders a banner with a link', async ({ page }) => {
    await page.route(REMOTE_CONFIG_URL, route =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          websiteBanners: {
            index: {
              text: 'Read the release notes',
              link: 'https://nodejs.org/releases',
            },
          },
        }),
      })
    );

    await page.goto('/assert.html');

    const banner = page.getByRole('region', { name: 'Announcement' });
    await expect(banner).toBeVisible();

    const link = banner.getByRole('link', { name: 'Read the release notes' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'https://nodejs.org/releases');
    await expect(link).toHaveAttribute('target', '_blank');
  });

  test('does not render when there are no active banners', async ({ page }) => {
    await page.route(REMOTE_CONFIG_URL, route =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ websiteBanners: {} }),
      })
    );

    await page.goto('/assert.html');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('region', { name: 'Announcement' })
    ).not.toBeAttached();
  });

  test('persists dismissal until the banner text changes', async ({ page }) => {
    let text = 'Dismiss this announcement';

    await page.route(REMOTE_CONFIG_URL, route =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          websiteBanners: { index: { text } },
        }),
      })
    );

    await page.goto('/assert.html');

    const banner = page.getByRole('region', { name: 'Announcement' });
    await banner.getByRole('button', { name: 'Close banner' }).click();
    await expect(banner).not.toBeAttached();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('banner-dismissal')))
      .toBe(text);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(banner).not.toBeAttached();

    text = 'A new announcement';
    await page.reload();
    await expect(banner).toContainText(text);
  });
});
