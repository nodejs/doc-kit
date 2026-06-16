import { deepStrictEqual, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { collectAsyncGenerator, createCache } from '../caching.mjs';

describe('caching', () => {
  describe('collectAsyncGenerator', () => {
    it('should collect all chunks into a flat array', async () => {
      async function* gen() {
        yield [1, 2];
        yield [3, 4];
        yield [5];
      }

      const result = await collectAsyncGenerator(gen());

      deepStrictEqual(result, [1, 2, 3, 4, 5]);
    });

    it('should return empty array for empty generator', async () => {
      async function* gen() {
        // empty generator
      }

      const result = await collectAsyncGenerator(gen());

      deepStrictEqual(result, []);
    });

    it('should handle empty chunks', async () => {
      async function* gen() {
        yield [];
        yield [1];
        yield [];
        yield [2, 3];
      }

      const result = await collectAsyncGenerator(gen());

      deepStrictEqual(result, [1, 2, 3]);
    });
  });

  describe('createCache', () => {
    it('should report whether a generator is stored', () => {
      const cache = createCache();

      strictEqual(cache.has('a'), false);
      cache.store('a', Promise.resolve(1));
      strictEqual(cache.has('a'), true);
    });

    it('should pass through non-streaming results', async () => {
      const cache = createCache();

      cache.store('a', Promise.resolve({ value: 42 }));

      deepStrictEqual(await cache.consume('a'), { value: 42 });
    });

    it('should collect a streaming result only once for all consumers', async () => {
      const cache = createCache();

      let iterations = 0;

      async function* gen() {
        iterations++;
        yield [1, 2];
        yield [3];
      }

      cache.store('a', gen());

      const first = await cache.consume('a');
      const second = await cache.consume('a');

      deepStrictEqual(first, [1, 2, 3]);
      // The same collected array is shared, collection happened a single time
      strictEqual(first, second);
      strictEqual(iterations, 1);
    });

    it('should count consumers across a dependency closure', async () => {
      const cache = createCache();

      // graph: a -> b -> c and d -> b; requested targets are a and d
      const graph = { a: 'b', b: 'c', d: 'b' };

      cache.populateConsumerCounts(['a', 'd'], name => graph[name]);

      // `b` is depended on by both `a` and `d`, so it needs two reads before
      // it is evicted.
      cache.store('b', Promise.resolve('B'));
      await cache.consume('b');
      strictEqual(cache.has('b'), true);
      await cache.consume('b');
      strictEqual(cache.has('b'), false);

      // `c` is depended on only by `b`, so a single read evicts it.
      cache.store('c', Promise.resolve('C'));
      await cache.consume('c');
      strictEqual(cache.has('c'), false);

      // `a` is a requested target, consumed exactly once by the final read.
      cache.store('a', Promise.resolve('A'));
      await cache.consume('a');
      strictEqual(cache.has('a'), false);
    });
  });
});
