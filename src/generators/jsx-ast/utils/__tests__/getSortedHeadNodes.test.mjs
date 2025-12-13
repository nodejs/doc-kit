import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getSortedHeadNodes } from '../getSortedHeadNodes.mjs';

describe('getSortedHeadNodes', () => {
  it('filters to depth 1 and sorts by overridden positions then name', () => {
    const entries = [
      { api: 'zlib', heading: { depth: 1, data: { name: 'Zlib' } } },
      { api: 'index', heading: { depth: 1, data: { name: 'Index' } } },
      { api: 'fs', heading: { depth: 1, data: { name: 'File System' } } },
      { api: 'synopsis', heading: { depth: 1, data: { name: 'Synopsis' } } },
      { api: 'not-head', heading: { depth: 2, data: { name: 'Nope' } } },
    ];

    const out = getSortedHeadNodes(entries);

    assert.deepEqual(
      out.map(n => n.api),
      ['index', 'synopsis', 'fs', 'zlib']
    );
  });
});
