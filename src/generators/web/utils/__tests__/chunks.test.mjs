import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createChunkedRequire } from '../chunks.mjs';

describe('generators/web/utils - chunks', () => {
  it('createChunkedRequire resolves virtual chunks and falls back to require', () => {
    const chunks = [
      { fileName: 'a.js', code: 'module.exports = { val: 1 };' },
      {
        fileName: 'b.js',
        code: 'const a = require("./a.js"); module.exports = { val: a.val + 1 };',
      },
    ];

    const fakeRequire = path => {
      if (path === 'fs') {
        return { read: true };
      }
      return null;
    };

    const req = createChunkedRequire(chunks, fakeRequire);

    // resolve virtual module
    const a = req('./a.js');
    assert.deepEqual(a, { val: 1 });

    // module that requires another virtual module
    const b = req('./b.js');
    assert.deepEqual(b, { val: 2 });

    // fallback to external
    const ext = req('fs');
    assert.deepEqual(ext, { read: true });
  });
});
