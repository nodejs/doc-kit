import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_PAGE_WEIGHT,
  normalizePageWeight,
  compareSidebarPageWeight,
  buildSidebarPages,
} from '../pages.mjs';

describe('normalizePageWeight', () => {
  it('returns finite numeric weights as-is', () => {
    assert.equal(normalizePageWeight(10), 10);
    assert.equal(normalizePageWeight(0), 0);
    assert.equal(normalizePageWeight(-3), -3);
  });

  it('parses string numeric weights', () => {
    assert.equal(normalizePageWeight('10'), 10);
    assert.equal(normalizePageWeight('  5.5  '), 5.5);
  });

  it('falls back to default for invalid values', () => {
    assert.equal(normalizePageWeight(undefined), DEFAULT_PAGE_WEIGHT);
    assert.equal(normalizePageWeight(''), DEFAULT_PAGE_WEIGHT);
    assert.equal(normalizePageWeight('abc'), DEFAULT_PAGE_WEIGHT);
    assert.equal(normalizePageWeight(Number.NaN), DEFAULT_PAGE_WEIGHT);
  });
});

describe('compareSidebarPageWeight', () => {
  it('sorts explicit weights before default weight', () => {
    assert.equal(compareSidebarPageWeight({ weight: 5 }, { weight: -1 }), -1);
    assert.equal(compareSidebarPageWeight({ weight: -1 }, { weight: 5 }), 1);
  });

  it('sorts by ascending explicit weight', () => {
    assert.equal(compareSidebarPageWeight({ weight: 1 }, { weight: 2 }), -1);
    assert.equal(compareSidebarPageWeight({ weight: 3 }, { weight: 2 }), 1);
  });

  it('keeps relative weight when both sides are default', () => {
    assert.equal(compareSidebarPageWeight({ weight: -1 }, { weight: -1 }), 0);
  });
});

describe('buildSidebarPages', () => {
  it('builds [weight, page] tuples and keeps optional category', () => {
    const pages = buildSidebarPages([
      {
        path: '/buffer',
        heading: { data: { name: 'Buffer' } },
        weight: '20',
      },
      {
        path: '/fs',
        category: 'File System',
        heading: { data: { name: 'File System' } },
      },
      {
        path: '/http',
        heading: { data: { name: 'HTTP' } },
        weight: 10,
      },
    ]);

    assert.deepStrictEqual(pages, [
      [10, { heading: 'HTTP', path: '/http' }],
      [20, { heading: 'Buffer', path: '/buffer' }],
      [-1, { heading: 'File System', path: '/fs', category: 'File System' }],
    ]);
  });
});
