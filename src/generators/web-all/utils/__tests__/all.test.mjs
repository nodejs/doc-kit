import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildAllPage } from '../all.mjs';

describe('buildAllPage', () => {
  it('returns a synthetic `all` head with an "All" heading', () => {
    const { head } = buildAllPage([]);

    assert.equal(head.api, 'all');
    assert.equal(head.path, '/all');
    assert.equal(head.basename, 'all');
    assert.equal(head.heading.data.name, 'All');
  });

  it('forwards the input entries as the page entries', () => {
    const a = { api: 'fs', heading: { depth: 1, data: {} } };
    const b = { api: 'http', heading: { depth: 1, data: {} } };

    const { entries } = buildAllPage([a, b]);

    assert.deepEqual(entries, [a, b]);
  });

  it('does not mutate the input array', () => {
    const input = [{ api: 'fs' }];

    buildAllPage(input);

    assert.equal(input.length, 1);
  });
});
