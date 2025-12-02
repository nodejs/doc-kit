'use strict';

import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { isDeepStrictEqual } from 'node:util';

import { VFile } from 'vfile';

const fakeContent = '# Hello';
mock.module('node:fs/promises', {
  namedExports: {
    readFile: () => Promise.resolve(fakeContent),
  },
});

mock.module('node:fs', {
  namedExports: {
    globSync: (/** @type {string[]} */ path) => {
      if (isDeepStrictEqual(path, ['ignore.md'])) {
        return ['/fake/path/file2.md'];
      }
      return [
        '/fake/path/file1.md',
        '/fake/path/file2.md',
        '/fake/path/not-a-md-file.txt',
      ];
    },
  },
});

const { default: createLoader } = await import('../markdown.mjs');

describe('markdown-loader', () => {
  it('should load markdown files into VFiles', async () => {
    const fakeFiles = [
      '/fake/path/file1.md',
      '/fake/path/file2.md',
      '/fake/path/not-a-md-file.txt',
    ];

    const loader = createLoader();
    const vfiles = await loader.loadFiles(['*.md']);

    assert.strictEqual(vfiles.length, 2);
    assert.ok(vfiles[0] instanceof VFile);
    assert.strictEqual(vfiles[0].path, fakeFiles[0]);
    assert.strictEqual(vfiles[0].value, fakeContent);
    assert.strictEqual(vfiles[1].path, fakeFiles[1]);
    assert.strictEqual(vfiles[1].value, fakeContent);
  });

  it('should ignore specified files', async () => {
    const loader = createLoader();
    const vfiles = await loader.loadFiles(['*.md'], ['ignore.md']);

    assert.strictEqual(vfiles.length, 1);
    assert.strictEqual(vfiles[0].path, '/fake/path/file1.md');
  });
});
