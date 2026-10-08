import { expect, test } from '@playwright/test';

const REMOTE_CONFIG_URL = 'https://nodejs.org/site.json';

/**
 * Navigates the way following a link does, and waits for the navigation to
 * finish, or for the one replacing it when the router follows a redirect.
 */
const navigate = (page, url) =>
  page.evaluate(
    url =>
      navigation
        .navigate(url)
        .finished.catch(() => navigation.transition?.finished)
        .then(() => {}),
    url
  );

test.describe('Client-side navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(REMOTE_CONFIG_URL, route =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          websiteBanners: { index: { text: 'Important announcement' } },
        }),
      })
    );

    await page.goto('/assert.html');

    // A full load would start a new document, and lose this
    await page.evaluate(() => (window.__document = 'first'));
  });

  test('swaps the next page in without loading assets again', async ({
    page,
  }) => {
    const loaded = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          'script[src], link[rel="stylesheet"], link[as="font"]'
        ),
      ].map(element => element.src || element.href)
    );

    const requests = [];
    page.on('request', request => requests.push(request.url()));

    await navigate(page, 'all.html');

    // `serve` redirects `all.html` to `all`, as hosts with clean URLs do
    await expect(page).toHaveURL(/\/all$/);
    await expect(page).toHaveTitle(/^All \|/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      /^All \|/
    );
    expect(await page.evaluate(() => window.__document)).toBe('first');

    // The scripts, stylesheets and fonts are still loaded
    expect(requests.filter(url => loaded.includes(url))).toEqual([]);
  });

  test('goes back to the previous page, where it was scrolled to', async ({
    page,
  }) => {
    await page.evaluate(() => scrollTo(0, 2000));
    await navigate(page, 'all.html');
    await page.evaluate(() => navigation.back().finished.then(() => {}));

    // Hosts with clean URLs redirect the first page to one without `.html`
    await expect(page).toHaveURL(/\/assert(\.html)?$/);
    await expect(page).toHaveTitle(/^Assert \|/);
    expect(await page.evaluate(() => scrollY)).toBe(2000);
    expect(await page.evaluate(() => window.__document)).toBe('first');
  });

  test('prefetches a page as its link is hovered', async ({ page }) => {
    await page.evaluate(() =>
      document
        .querySelector('main')
        .insertAdjacentHTML('beforeend', '<a id="all" href="all.html">All</a>')
    );

    // Hosts with clean URLs answer the prefetch with a redirect first
    const prefetched = page.waitForResponse(
      response => /\/all(\.html)?$/.test(response.url()) && response.ok()
    );

    await page.hover('#all');
    await prefetched;

    const requests = [];
    page.on('request', request => requests.push(request.url()));

    await page.click('#all');

    await expect(page).toHaveTitle(/^All \|/);
    expect(requests).toEqual([]);
  });

  test('keeps the remote config, and shows its banner at once', async ({
    page,
  }) => {
    const banner = page.getByRole('region', { name: 'Announcement' });
    await expect(banner).toBeVisible();

    let fetched = 0;

    await page.route(REMOTE_CONFIG_URL, route => {
      fetched++;
      return route.fallback();
    });

    await navigate(page, 'all.html');

    await expect(banner).toBeVisible();
    // It animates in on the first page only
    await expect(banner).toHaveCSS('animation-name', 'none');
    expect(fetched).toBe(0);
  });

  test('leaves links to files that are not pages to the browser', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'JSON' }).click();

    await expect(page).toHaveURL(/\/assert\.json$/);
    expect(await page.evaluate(() => window.__document)).toBeUndefined();
  });
});
