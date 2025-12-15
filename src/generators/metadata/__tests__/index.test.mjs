import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import generator from '../index.mjs';

describe('generators/metadata/index', () => {
  it('streams chunk results and yields flattened arrays', async () => {
    const inputs = [1, 2, 3];

    const worker = {
      // Simulate an async generator that yields chunked results
      async *stream() {
        yield [[1, 2], [3]];
        yield [[4]];
      },
    };

    const results = [];

    for await (const chunk of generator.generate(inputs, {
      typeMap: {},
      worker,
    })) {
      results.push(chunk);
    }

    assert.strictEqual(results.length, 2);
    assert.deepStrictEqual(results[0], [1, 2, 3]);
    assert.deepStrictEqual(results[1], [4]);
  });
});
