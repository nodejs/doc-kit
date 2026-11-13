import { deepStrictEqual, strictEqual, throws } from 'node:assert';
import { describe, it } from 'node:test';

import { collectAsyncGenerator, createCache } from '../caching.mjs';
import {
  collectGarbage,
  trackReleases,
} from './fixtures/garbage-collection.mjs';

/**
 * Reads up to `count` chunks of items, keeping only the items' values, so that
 * the test holds none of the chunks.
 *
 * @param {AsyncIterator<Array<{ value: number }>>} reader
 * @param {number} [count]
 * @returns {Promise<number[]>}
 */
async function readValues(reader, count = Infinity) {
  const values = [];

  for (let i = 0; i < count; i++) {
    const { value, done } = await reader.next();

    if (done) {
      break;
    }

    values.push(...value.map(item => item.value));
  }

  return values;
}

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

    it('should run a generator once for streaming and collecting consumers', async () => {
      const cache = createCache();

      let iterations = 0;

      async function* gen() {
        iterations++;
        yield [1, 2];
        yield [3];
      }

      cache.store('a', gen());

      const [streamed, collected] = await Promise.all([
        cache.stream('a').then(stream => Array.fromAsync(stream)),
        cache.consume('a'),
      ]);

      deepStrictEqual(streamed, [[1, 2], [3]]);
      deepStrictEqual(collected, [1, 2, 3]);
      strictEqual(iterations, 1);
    });

    it('should stream a non-streaming result as a single chunk', async () => {
      const cache = createCache();

      cache.store('a', Promise.resolve([1, 2]));

      const stream = await cache.stream('a');

      deepStrictEqual(await Array.fromAsync(stream), [[1, 2]]);
    });

    it('should read a stream only once', async () => {
      const cache = createCache();

      async function* gen() {
        yield [1];
      }

      cache.store('a', gen());

      const stream = await cache.stream('a');

      deepStrictEqual(await Array.fromAsync(stream), [[1]]);
      throws(() => stream[Symbol.asyncIterator](), /can only be read once/);
    });

    it('should run a stream before it is read, and count it as a read', async () => {
      const cache = createCache();

      let produced = 0;

      cache.populateConsumerCounts(['a'], () => undefined);

      async function* gen() {
        for (const value of [1, 2, 3]) {
          produced++;

          yield [value];
        }
      }

      cache.store('a', gen());

      // Its only read: the result is evicted, and its chunks go once read
      const stream = await cache.stream('a');

      strictEqual(cache.has('a'), false);

      await new Promise(resolve => setImmediate(resolve));

      // Every chunk is produced before the reader reads any
      strictEqual(produced, 3);
      deepStrictEqual(await Array.fromAsync(stream), [[1], [2], [3]]);
    });

    it('should let go of a chunk once every streaming reader has read it, while it still runs', async () => {
      const cache = createCache();
      const gate = Promise.withResolvers();
      const { released, chunkOf } = trackReleases();

      // `x` and `y` both read `a`
      cache.populateConsumerCounts(['x', 'y'], name =>
        name === 'a' ? undefined : 'a'
      );

      async function* gen() {
        yield chunkOf(1);
        yield chunkOf(2);
        await gate.promise;
      }

      cache.store('a', gen());

      // The second is the last read: no more readers can start
      const first = (await cache.stream('a'))[Symbol.asyncIterator]();
      const second = (await cache.stream('a'))[Symbol.asyncIterator]();

      deepStrictEqual(await readValues(first, 2), [1, 2]);

      // `second` has yet to read the first chunk
      await collectGarbage(() => released.has(1));

      strictEqual(released.has(1), false);

      deepStrictEqual(await readValues(second, 2), [1, 2]);

      await collectGarbage(() => released.has(1));

      strictEqual(released.has(1), true);

      gate.resolve();

      await readValues(first);
      await readValues(second);
    });
  });
});
