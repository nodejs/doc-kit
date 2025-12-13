import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('generators/web/utils - bundle', () => {
  it('bundleCode separates assets and chunks and returns expected shape', async () => {
    const bundleCode = (await import('../bundle.mjs')).default;

    const codeMap = new Map([['a.js', 'export default 1;']]);

    const result = await bundleCode(codeMap, { server: false });

    // Basic shape assertions to keep this test hermetic without module mocking
    assert.equal(typeof result.css, 'string');
    assert.ok(Array.isArray(result.chunks));
    assert.equal(
      typeof result.importMap === 'string' || result.importMap === undefined,
      true
    );
    assert.ok(
      result.chunks.every(
        c => typeof c.fileName === 'string' && 'code' in c && 'isEntry' in c
      )
    );
  });
});
