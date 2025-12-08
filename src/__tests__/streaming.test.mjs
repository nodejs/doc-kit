import { deepStrictEqual, ok, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import {
  isAsyncGenerator,
  collectAsyncGenerator,
  createStreamingCache,
} from '../streaming.mjs';

describe('streaming utilities', () => {
  describe('isAsyncGenerator', () => {
    it('should return true for async generators', () => {
      async function* asyncGen() {
        yield 1;
      }

      const gen = asyncGen();

      strictEqual(isAsyncGenerator(gen), true);
    });

    it('should return false for regular generators', () => {
      function* syncGen() {
        yield 1;
      }

      const gen = syncGen();

      strictEqual(isAsyncGenerator(gen), false);
    });

    it('should return false for plain objects', () => {
      strictEqual(isAsyncGenerator({}), false);
      strictEqual(isAsyncGenerator([]), false);
      strictEqual(isAsyncGenerator({ async: true }), false);
    });

    it('should return false for null and undefined', () => {
      strictEqual(isAsyncGenerator(null), false);
      strictEqual(isAsyncGenerator(undefined), false);
    });

    it('should return false for primitives', () => {
      strictEqual(isAsyncGenerator(42), false);
      strictEqual(isAsyncGenerator('string'), false);
      strictEqual(isAsyncGenerator(true), false);
    });

    it('should return true for objects with Symbol.asyncIterator', () => {
      const asyncIterable = {
        [Symbol.asyncIterator]() {
          return {
            next: async () => ({ done: true, value: undefined }),
          };
        },
      };

      strictEqual(isAsyncGenerator(asyncIterable), true);
    });
  });

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

    it('should handle single chunk', async () => {
      async function* gen() {
        yield [1, 2, 3];
      }

      const result = await collectAsyncGenerator(gen());

      deepStrictEqual(result, [1, 2, 3]);
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

    it('should handle objects in chunks', async () => {
      async function* gen() {
        yield [{ a: 1 }, { b: 2 }];
        yield [{ c: 3 }];
      }

      const result = await collectAsyncGenerator(gen());

      deepStrictEqual(result, [{ a: 1 }, { b: 2 }, { c: 3 }]);
    });
  });

  describe('createStreamingCache', () => {
    it('should create a cache with required methods', () => {
      const cache = createStreamingCache();

      ok(cache);
      strictEqual(typeof cache.getOrCollect, 'function');
      strictEqual(typeof cache.has, 'function');
      strictEqual(typeof cache.clear, 'function');
    });

    it('should return same promise for same key', async () => {
      const cache = createStreamingCache();

      async function* gen() {
        yield [1, 2, 3];
      }

      const promise1 = cache.getOrCollect('test', gen());

      // Create a new generator (which shouldn't be used due to caching)
      async function* gen2() {
        yield [4, 5, 6];
      }

      const promise2 = cache.getOrCollect('test', gen2());

      // Both should resolve to the same result (from first generator)
      const result1 = await promise1;
      const result2 = await promise2;

      deepStrictEqual(result1, [1, 2, 3]);
      strictEqual(result1, result2);
    });

    it('should return different results for different keys', async () => {
      const cache = createStreamingCache();

      async function* gen1() {
        yield [1, 2];
      }

      async function* gen2() {
        yield [3, 4];
      }

      const result1 = await cache.getOrCollect('key1', gen1());
      const result2 = await cache.getOrCollect('key2', gen2());

      deepStrictEqual(result1, [1, 2]);
      deepStrictEqual(result2, [3, 4]);
    });

    it('should report has() correctly', async () => {
      const cache = createStreamingCache();

      strictEqual(cache.has('test'), false);

      async function* gen() {
        yield [1];
      }

      cache.getOrCollect('test', gen());

      strictEqual(cache.has('test'), true);
      strictEqual(cache.has('other'), false);
    });

    it('should clear all entries', async () => {
      const cache = createStreamingCache();

      async function* gen1() {
        yield [1];
      }

      async function* gen2() {
        yield [2];
      }

      cache.getOrCollect('key1', gen1());
      cache.getOrCollect('key2', gen2());

      strictEqual(cache.has('key1'), true);
      strictEqual(cache.has('key2'), true);

      cache.clear();

      strictEqual(cache.has('key1'), false);
      strictEqual(cache.has('key2'), false);
    });

    it('should allow re-adding after clear', async () => {
      const cache = createStreamingCache();

      async function* gen1() {
        yield [1, 2];
      }

      const result1 = await cache.getOrCollect('test', gen1());

      deepStrictEqual(result1, [1, 2]);

      cache.clear();

      async function* gen2() {
        yield [3, 4];
      }

      const result2 = await cache.getOrCollect('test', gen2());

      deepStrictEqual(result2, [3, 4]);
    });
  });
});
