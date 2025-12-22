import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

mock.module('node:fs/promises', {
  namedExports: {
    readFile: async () => 'file content',
  },
});

let originalFetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  globalThis.fetch = mock.fn(() =>
    Promise.resolve({
      text: () => Promise.resolve('fetched content'),
    })
  );
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

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

  it('should load content from a URL object', async () => {
    const result = await loadFromURL(new URL('https://example.com/data'));
    assert.equal(result, 'fetched content');
  });
});
