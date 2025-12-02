'use strict';

import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import { VFile } from 'vfile';

const fakeFiles = [
  '/fake/path/file1.js',
  '/fake/path/file2.js',
  '/fake/path/not-a-js-file.txt',
];

const fakeContent = 'const a = 1;';

mock.module('node:fs', {
  namedExports: {
    globSync: () => fakeFiles,
  },
});

mock.module('node:fs/promises', {
  namedExports: {
    readFile: () => Promise.resolve(fakeContent),
  },
});

const createLoader = (await import('../javascript.mjs')).default;

describe('javascript-loader', () => {
  it('should load javascript files into VFiles', async () => {
    const loader = createLoader();
    const vfiles = await loader.loadFiles('*.js');

    assert.strictEqual(vfiles.length, 2); // Ignored the .txt file

    assert.ok(vfiles[0] instanceof VFile);
    assert.strictEqual(vfiles[0].path, fakeFiles[0]);
    assert.strictEqual(vfiles[0].value, fakeContent);
    assert.strictEqual(vfiles[1].path, fakeFiles[1]);
    assert.strictEqual(vfiles[1].value, fakeContent);
  });
});
