import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isBannerActive } from '../banner.mjs';

const PAST = new Date(Date.now() - 86_400_000).toISOString(); // yesterday
const FUTURE = new Date(Date.now() + 86_400_000).toISOString(); // tomorrow

const banner = (overrides = {}) => ({
  text: 'Test banner',
  ...overrides,
});

describe('isBannerActive', () => {
  describe('no startDate, no endDate', () => {
    it('is always active', () => {
      assert.equal(isBannerActive(banner()), true);
    });
  });

  describe('startDate only', () => {
    it('is active when startDate is in the past', () => {
      assert.equal(isBannerActive(banner({ startDate: PAST })), true);
    });

    it('is not active when startDate is in the future', () => {
      assert.equal(isBannerActive(banner({ startDate: FUTURE })), false);
    });
  });

  describe('endDate only', () => {
    it('is active when endDate is in the future', () => {
      assert.equal(isBannerActive(banner({ endDate: FUTURE })), true);
    });

    it('is not active when endDate is in the past', () => {
      assert.equal(isBannerActive(banner({ endDate: PAST })), false);
    });
  });

  describe('startDate and endDate', () => {
    it('is active when now is within the range', () => {
      assert.equal(
        isBannerActive(banner({ startDate: PAST, endDate: FUTURE })),
        true
      );
    });

    it('is not active when now is before the range', () => {
      assert.equal(
        isBannerActive(banner({ startDate: FUTURE, endDate: FUTURE })),
        false
      );
    });

    it('is not active when now is after the range', () => {
      assert.equal(
        isBannerActive(banner({ startDate: PAST, endDate: PAST })),
        false
      );
    });
  });
});
