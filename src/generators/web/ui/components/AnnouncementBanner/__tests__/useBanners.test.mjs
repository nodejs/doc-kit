import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { renderHook, waitFor } from '@testing-library/react';

import { useBanners } from '../useBanners.mjs';

const PAST = new Date(Date.now() - 86_400_000).toISOString(); // yesterday
const FUTURE = new Date(Date.now() + 86_400_000).toISOString(); // tomorrow

const makeResponse = (banners, ok = true) => ({
  ok,
  json: async () => ({ websiteBanners: banners }),
});

describe('useBanners', () => {
  describe('fetch behavior', () => {
    it('fetches from the given URL', async t => {
      t.mock.method(global, 'fetch', () => Promise.resolve(makeResponse({})));

      renderHook(() =>
        useBanners({
          remoteConfig: 'https://example.com/site.json',
          versionMajor: null,
        })
      );

      await waitFor(() => assert.equal(global.fetch.mock.calls.length, 1));
      assert.equal(
        global.fetch.mock.calls[0].arguments[0],
        'https://example.com/site.json'
      );
    });

    it('returns an empty array on non-ok response', async t => {
      t.mock.method(global, 'fetch', () =>
        Promise.resolve(makeResponse({}, false))
      );

      const { result } = renderHook(() =>
        useBanners({
          remoteConfig: 'https://example.com/site.json',
          versionMajor: null,
        })
      );

      await waitFor(() => assert.equal(global.fetch.mock.calls.length, 1));
      assert.deepEqual(result.current.banners, []);
    });

    it('handles fetch errors silently', async t => {
      t.mock.method(global, 'fetch', () =>
        Promise.reject(new Error('Network error'))
      );

      const { result } = renderHook(() =>
        useBanners({
          remoteConfig: 'https://example.com/site.json',
          versionMajor: null,
        })
      );

      await waitFor(() => assert.equal(global.fetch.mock.calls.length, 1));
      assert.deepEqual(result.current.banners, []);
    });
  });

  describe('banner selection', () => {
    it('returns the active global (index) banner', async t => {
      const banner = { text: 'Global banner', type: 'warning' };
      t.mock.method(global, 'fetch', () =>
        Promise.resolve(makeResponse({ index: banner }))
      );

      const { result } = renderHook(() =>
        useBanners({
          remoteConfig: 'https://example.com/site.json',
          versionMajor: null,
        })
      );

      await waitFor(() => assert.deepEqual(result.current.banners, [banner]));
    });

    it('returns the active version-specific banner', async t => {
      const banner = { text: 'v20 banner', type: 'warning' };
      t.mock.method(global, 'fetch', () =>
        Promise.resolve(makeResponse({ v20: banner }))
      );

      const { result } = renderHook(() =>
        useBanners({
          remoteConfig: 'https://example.com/site.json',
          versionMajor: 20,
        })
      );

      await waitFor(() => assert.deepEqual(result.current.banners, [banner]));
    });

    it('returns both global and version banners when both are active', async t => {
      const globalBanner = { text: 'Global banner', type: 'warning' };
      const versionBanner = { text: 'v20 banner', type: 'error' };
      t.mock.method(global, 'fetch', () =>
        Promise.resolve(
          makeResponse({ index: globalBanner, v20: versionBanner })
        )
      );

      const { result } = renderHook(() =>
        useBanners({
          remoteConfig: 'https://example.com/site.json',
          versionMajor: 20,
        })
      );

      await waitFor(() =>
        assert.deepEqual(result.current.banners, [globalBanner, versionBanner])
      );
    });

    it('returns global banner first, version banner second', async t => {
      const globalBanner = { text: 'Global', type: 'warning' };
      const versionBanner = { text: 'v22', type: 'error' };
      t.mock.method(global, 'fetch', () =>
        Promise.resolve(
          makeResponse({ index: globalBanner, v22: versionBanner })
        )
      );

      const { result } = renderHook(() =>
        useBanners({
          remoteConfig: 'https://example.com/site.json',
          versionMajor: 22,
        })
      );

      await waitFor(() => {
        assert.equal(result.current.banners[0], globalBanner);
        assert.equal(result.current.banners[1], versionBanner);
      });
    });

    it('does not include the version banner when versionMajor is null', async t => {
      const globalBanner = { text: 'Global banner', type: 'warning' };
      const versionBanner = { text: 'v20 banner', type: 'error' };
      t.mock.method(global, 'fetch', () =>
        Promise.resolve(
          makeResponse({ index: globalBanner, v20: versionBanner })
        )
      );

      const { result } = renderHook(() =>
        useBanners({
          remoteConfig: 'https://example.com/site.json',
          versionMajor: null,
        })
      );

      await waitFor(() =>
        assert.deepEqual(result.current.banners, [globalBanner])
      );
    });

    it('returns an empty array when websiteBanners is absent', async t => {
      t.mock.method(global, 'fetch', () =>
        Promise.resolve({ ok: true, json: async () => ({}) })
      );

      const { result } = renderHook(() =>
        useBanners({
          remoteConfig: 'https://example.com/site.json',
          versionMajor: null,
        })
      );

      await waitFor(() => assert.equal(global.fetch.mock.calls.length, 1));
      assert.deepEqual(result.current.banners, []);
    });
  });

  describe('date filtering', () => {
    it('excludes a banner whose endDate has passed', async t => {
      const banner = { text: 'Expired', type: 'warning', endDate: PAST };
      t.mock.method(global, 'fetch', () =>
        Promise.resolve(makeResponse({ index: banner }))
      );

      const { result } = renderHook(() =>
        useBanners({
          remoteConfig: 'https://example.com/site.json',
          versionMajor: null,
        })
      );

      await waitFor(() => assert.equal(global.fetch.mock.calls.length, 1));
      assert.deepEqual(result.current.banners, []);
    });

    it('excludes a banner whose startDate is in the future', async t => {
      const banner = { text: 'Upcoming', type: 'warning', startDate: FUTURE };
      t.mock.method(global, 'fetch', () =>
        Promise.resolve(makeResponse({ index: banner }))
      );

      const { result } = renderHook(() =>
        useBanners({
          remoteConfig: 'https://example.com/site.json',
          versionMajor: null,
        })
      );

      await waitFor(() => assert.equal(global.fetch.mock.calls.length, 1));
      assert.deepEqual(result.current.banners, []);
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

      const { result } = renderHook(() =>
        useBanners({
          remoteConfig: 'https://example.com/site.json',
          versionMajor: null,
        })
      );

      await waitFor(() => assert.deepEqual(result.current.banners, [banner]));
    });
  });
});
