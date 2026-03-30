'use strict';

import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

mock.module('node:fs/promises', {
  namedExports: {
    readFile: async () => 'file content',
  },
});

global.fetch = mock.fn(() =>
  Promise.resolve({
    text: () => Promise.resolve('fetched content'),
  })
);

const { loadFromURL } = await import('../parser.mjs');

describe('loadFromURL', () => {
  it('should load content from a file path', async () => {
    const result = await loadFromURL('path/to/file.txt');
    assert.equal(result, 'file content');
  });

  it('should load content from a URL', async () => {
    const result = await loadFromURL('https://example.com/data');
    assert.equal(result, 'fetched content');
  });
});
