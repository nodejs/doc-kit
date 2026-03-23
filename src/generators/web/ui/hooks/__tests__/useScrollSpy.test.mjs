import { strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { getActiveSlug } from '../useScrollSpy.mjs';

describe('getActiveSlug', () => {
  it('should return null for an empty entries array', () => {
    strictEqual(getActiveSlug([]), null);
  });

  it('should return null when no entry is intersecting', () => {
    const entries = [
      { isIntersecting: false, target: { id: 'intro' } },
      { isIntersecting: false, target: { id: 'usage' } },
    ];

    strictEqual(getActiveSlug(entries), null);
  });

  it('should return the id of the first intersecting entry', () => {
    const entries = [
      { isIntersecting: false, target: { id: 'intro' } },
      { isIntersecting: true, target: { id: 'usage' } },
      { isIntersecting: true, target: { id: 'api' } },
    ];

    strictEqual(getActiveSlug(entries), 'usage');
  });

  it('should return the id when only one entry is intersecting', () => {
    const entries = [
      { isIntersecting: false, target: { id: 'intro' } },
      { isIntersecting: true, target: { id: 'config' } },
    ];

    strictEqual(getActiveSlug(entries), 'config');
  });
});
