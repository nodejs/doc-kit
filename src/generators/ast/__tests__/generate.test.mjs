'use strict';

import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

// Mock fs/promises so processChunk doesn't touch the real filesystem
mock.module('node:fs/promises', {
  namedExports: {
    readFile: async () => '# Hello',
  },
});

// Mock remark to avoid parsing overhead
mock.module('../../../utils/remark.mjs', {
  namedExports: {
    getRemark: () => ({ parse: () => ({ type: 'root', children: [] }) }),
  },
});

// Mock queries to avoid regex replacements interfering
mock.module('../../../utils/queries/index.mjs', {
  namedExports: {
    QUERIES: {
      standardYamlFrontmatter: /(?!x)x/, // never matches
      stabilityIndexPrefix: /(?!x)x/, // never matches
    },
  },
});

const { processChunk } = await import('../generate.mjs');

describe('processChunk path computation', () => {
  it('strips /index suffix from a top-level index file', async () => {
    const results = await processChunk([['doc/api/index.md', 'doc/api']], [0]);
    assert.strictEqual(results[0].path, '/');
  });

  it('strips /index suffix from a nested index file', async () => {
    const results = await processChunk(
      [['doc/api/sub/index.md', 'doc/api']],
      [0]
    );
    assert.strictEqual(results[0].path, '/sub');
  });

  it('keeps path unchanged for non-index files', async () => {
    const results = await processChunk([['doc/api/fs.md', 'doc/api']], [0]);
    assert.strictEqual(results[0].path, '/fs');
  });

  it('keeps path unchanged for files whose name contains index but is not index', async () => {
    const results = await processChunk(
      [['doc/api/indexes.md', 'doc/api']],
      [0]
    );
    assert.strictEqual(results[0].path, '/indexes');
  });

  it('processes multiple files correctly', async () => {
    const input = [
      ['doc/api/index.md', 'doc/api'],
      ['doc/api/fs.md', 'doc/api'],
      ['doc/api/sub/index.md', 'doc/api'],
    ];
    const results = await processChunk(input, [0, 1, 2]);
    assert.strictEqual(results[0].path, '/');
    assert.strictEqual(results[1].path, '/fs');
    assert.strictEqual(results[2].path, '/sub');
  });
});
