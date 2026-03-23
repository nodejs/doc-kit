import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadBanners } from '../loadBanners.mjs';

const PAST = new Date(Date.now() - 86_400_000).toISOString(); // yesterday
const FUTURE = new Date(Date.now() + 86_400_000).toISOString(); // tomorrow

const makeResponse = (banners, ok = true) => ({
  ok,
  json: async () => ({ websiteBanners: banners }),
});

describe('loadBanners', () => {
  describe('fetch behavior', () => {
    it('fetches from the given URL', async t => {
      t.mock.method(global, 'fetch', () => Promise.resolve(makeResponse({})));

      await loadBanners('https://example.com/site.json', null);

      assert.equal(global.fetch.mock.calls.length, 1);
      assert.equal(
        global.fetch.mock.calls[0].arguments[0],
        'https://example.com/site.json'
      );
    });

    it('returns an empty array on non-ok response', async t => {
      t.mock.method(global, 'fetch', () =>
        Promise.resolve(makeResponse({}, false))
      );

      const result = await loadBanners('https://example.com/site.json', null);

      assert.deepEqual(result, []);
    });

    it('handles fetch errors silently', async t => {
      t.mock.method(global, 'fetch', () =>
        Promise.reject(new Error('Network error'))
      );

      const result = await loadBanners('https://example.com/site.json', null);

      assert.deepEqual(result, []);
    });

    it('returns an empty array when remoteConfig is absent', async t => {
      t.mock.method(global, 'fetch', () => Promise.resolve(makeResponse({})));

      const result = await loadBanners(undefined, null);

      assert.deepEqual(result, []);
      assert.equal(global.fetch.mock.calls.length, 0);
    });
  });

  describe('banner selection', () => {
    it('returns the active global (index) banner', async t => {
      const banner = { text: 'Global banner', type: 'warning' };
      t.mock.method(global, 'fetch', () =>
        Promise.resolve(makeResponse({ index: banner }))
      );

      const result = await loadBanners('https://example.com/site.json', null);

      assert.deepEqual(result, [banner]);
    });

    it('returns the active version-specific banner', async t => {
      const banner = { text: 'v20 banner', type: 'warning' };
      t.mock.method(global, 'fetch', () =>
        Promise.resolve(makeResponse({ v20: banner }))
      );

      const result = await loadBanners('https://example.com/site.json', 20);

      assert.deepEqual(result, [banner]);
    });

    it('returns both global and version banners when both are active', async t => {
      const globalBanner = { text: 'Global banner', type: 'warning' };
      const versionBanner = { text: 'v20 banner', type: 'error' };
      t.mock.method(global, 'fetch', () =>
        Promise.resolve(
          makeResponse({ index: globalBanner, v20: versionBanner })
        )
      );

      const result = await loadBanners('https://example.com/site.json', 20);

      assert.deepEqual(result, [globalBanner, versionBanner]);
    });

    it('returns global banner first, version banner second', async t => {
      const globalBanner = { text: 'Global', type: 'warning' };
      const versionBanner = { text: 'v22', type: 'error' };
      t.mock.method(global, 'fetch', () =>
        Promise.resolve(
          makeResponse({ index: globalBanner, v22: versionBanner })
        )
      );

      const result = await loadBanners('https://example.com/site.json', 22);

      assert.equal(result[0], globalBanner);
      assert.equal(result[1], versionBanner);
    });

    it('does not include the version banner when versionMajor is null', async t => {
      const globalBanner = { text: 'Global banner', type: 'warning' };
      const versionBanner = { text: 'v20 banner', type: 'error' };
      t.mock.method(global, 'fetch', () =>
        Promise.resolve(
          makeResponse({ index: globalBanner, v20: versionBanner })
        )
      );

      const result = await loadBanners('https://example.com/site.json', null);

      assert.deepEqual(result, [globalBanner]);
    });

    it('returns an empty array when websiteBanners is absent', async t => {
      t.mock.method(global, 'fetch', () =>
        Promise.resolve({ ok: true, json: async () => ({}) })
      );

      const result = await loadBanners('https://example.com/site.json', null);

      assert.deepEqual(result, []);
    });
  });

  describe('date filtering', () => {
    it('excludes a banner whose endDate has passed', async t => {
      const banner = { text: 'Expired', type: 'warning', endDate: PAST };
      t.mock.method(global, 'fetch', () =>
        Promise.resolve(makeResponse({ index: banner }))
      );

      const result = await loadBanners('https://example.com/site.json', null);

      assert.deepEqual(result, []);
    });

    it('excludes a banner whose startDate is in the future', async t => {
      const banner = { text: 'Upcoming', type: 'warning', startDate: FUTURE };
      t.mock.method(global, 'fetch', () =>
        Promise.resolve(makeResponse({ index: banner }))
      );

      const result = await loadBanners('https://example.com/site.json', null);

      assert.deepEqual(result, []);
    });

    it('includes a banner within its active date range', async t => {
      const banner = {
        text: 'Active',
        type: 'warning',
        startDate: PAST,
        endDate: FUTURE,
      };
      t.mock.method(global, 'fetch', () =>
        Promise.resolve(makeResponse({ index: banner }))
      );

      const result = await loadBanners('https://example.com/site.json', null);

      assert.deepEqual(result, [banner]);
    });
  });
});
