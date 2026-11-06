import { deepStrictEqual, rejects, strictEqual, throws } from 'node:assert';
import { describe, it } from 'node:test';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';

import { collectAsyncGenerator, createCache } from '../caching.mjs';

setFlagsFromString('--expose-gc');

// Collects garbage, to tell what is let go
const gc = runInNewContext('gc');

/**
 * Reads every chunk of an async iterable.
 *
 * @template T
 * @param {AsyncIterable<T[]>} iterable
 * @returns {Promise<T[][]>}
 */
async function collectChunks(iterable) {
  const chunks = [];

  for await (const chunk of iterable) {
    chunks.push(chunk);
  }

  return chunks;
}

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

/**
 * Makes chunks of one item each that tell when they are let go.
 *
 * @returns {{ released: Set<number>, chunkOf: (value: number) => Array<{ value: number }> }}
 */
function trackReleases() {
  const released = new Set();
  const registry = new FinalizationRegistry(value => released.add(value));

  return {
    released,

    /**
     * A chunk holding an item that tells when it is let go.
     *
     * @param {number} value
     * @returns {Array<{ value: number }>}
     */
    chunkOf: value => {
      const item = { value };

      registry.register(item, value);

      return [item];
    },
  };
}

/**
 * Collects garbage until `done` holds, at most ten times.
 *
 * @param {() => boolean} done
 * @returns {Promise<void>}
 */
async function collectGarbage(done) {
  for (let i = 0; i < 10 && !done(); i++) {
    await new Promise(resolve => setImmediate(resolve));
    gc();
  }
}

/**
 * Runs `fn`, and gives the rejections left unhandled while it ran.
 *
 * @param {() => Promise<void>} fn
 * @returns {Promise<unknown[]>}
 */
async function unhandledRejectionsOf(fn) {
  const unhandled = [];
  const onUnhandled = error => unhandled.push(error);

  process.on('unhandledRejection', onUnhandled);

  try {
    await fn();

    // A rejection left unhandled is reported once the microtasks have run
    await new Promise(resolve => setImmediate(resolve));
  } finally {
    process.off('unhandledRejection', onUnhandled);
  }

  return unhandled;
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

    it(
      'should stream chunks before the generator completes',
      // The generator waits for its first chunk to be read, so a stream that
      // waited for the generator to complete would never give it
      { timeout: 10_000 },
      async () => {
        const cache = createCache();
        const gate = Promise.withResolvers();

        async function* gen() {
          yield [1];
          await gate.promise;
          yield [2];
        }

        cache.store('a', gen());

        const stream = await cache.stream('a');
        const reader = stream[Symbol.asyncIterator]();
        const first = await reader.next();

        // The first chunk arrives while the generator still waits on the gate
        deepStrictEqual(first.value, [1]);

        gate.resolve();

        const rest = await collectChunks(reader);

        deepStrictEqual(rest, [[2]]);
      }
    );

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
        cache.stream('a').then(collectChunks),
        cache.consume('a'),
      ]);

      deepStrictEqual(streamed, [[1, 2], [3]]);
      deepStrictEqual(collected, [1, 2, 3]);
      strictEqual(iterations, 1);
    });

    it('should replay every chunk to a reader that starts late', async () => {
      const cache = createCache();

      async function* gen() {
        yield [1];
        yield [2];
      }

      cache.store('a', gen());

      await cache.consume('a');

      const reader = await cache.stream('a');
      const chunks = await collectChunks(reader);

      deepStrictEqual(chunks, [[1], [2]]);
    });

    it('should stream a non-streaming result as a single chunk', async () => {
      const cache = createCache();

      cache.store('a', Promise.resolve([1, 2]));

      const reader = await cache.stream('a');
      const chunks = await collectChunks(reader);

      deepStrictEqual(chunks, [[1, 2]]);
    });

    it('should throw a failure to streaming readers after the chunks before it', async () => {
      const cache = createCache();

      async function* gen() {
        yield [1];
        throw new Error('boom');
      }

      cache.store('a', gen());

      const chunks = [];

      const unhandled = await unhandledRejectionsOf(() =>
        rejects(async () => {
          const reader = await cache.stream('a');

          for await (const chunk of reader) {
            chunks.push(chunk);
          }
        }, /boom/)
      );

      deepStrictEqual(chunks, [[1]]);
      deepStrictEqual(unhandled, []);
    });

    it('should handle a failure before the stream is read', async () => {
      const cache = createCache();

      const unhandled = await unhandledRejectionsOf(async () => {
        cache.store('a', Promise.reject(new Error('boom')));

        // The reader is asked for as a generator that streams its input
        // starts, before it reads anything
        await rejects(cache.stream('a'), /boom/);
      });

      deepStrictEqual(unhandled, []);
    });

    it('should start recording a streamed result before it is read', async () => {
      const cache = createCache();

      let started = false;

      async function* gen() {
        started = true;
        yield [1];
      }

      cache.store('a', gen());

      const reader = await cache.stream('a');

      await new Promise(resolve => setImmediate(resolve));

      strictEqual(started, true);

      const chunks = await collectChunks(reader);

      deepStrictEqual(chunks, [[1]]);
    });

    it('should read a stream only once', async () => {
      const cache = createCache();

      async function* gen() {
        yield [1];
      }

      cache.store('a', gen());

      const stream = await cache.stream('a');
      const chunks = await collectChunks(stream);

      deepStrictEqual(chunks, [[1]]);
      throws(() => stream[Symbol.asyncIterator](), /can only be read once/);
    });

    it('should give a reader every chunk even if it starts reading after the result was evicted', async () => {
      const cache = createCache();

      cache.populateConsumerCounts(['a'], () => undefined);

      async function* gen() {
        yield [1];
        yield [2];
        yield [3];
      }

      cache.store('a', gen());

      // Its only read: the result is evicted, and its chunks go once read
      const stream = await cache.stream('a');

      strictEqual(cache.has('a'), false);

      // Every chunk is recorded before the reader reads any
      await new Promise(resolve => setImmediate(resolve));

      const chunks = await collectChunks(stream);

      deepStrictEqual(chunks, [[1], [2], [3]]);
    });

    it('should drain a result, alongside its other readers', async () => {
      const cache = createCache();
      const recorded = [];

      cache.populateConsumerCounts(['a', 'b'], name =>
        name === 'b' ? 'a' : undefined
      );

      async function* gen() {
        for (const value of [1, 2, 3]) {
          recorded.push(value);

          yield [value];
        }
      }

      cache.store('a', gen());

      const reader = await cache.stream('a');

      await cache.drain('a');

      strictEqual(cache.has('a'), false);
      deepStrictEqual(recorded, [1, 2, 3]);

      const chunks = await collectChunks(reader);

      deepStrictEqual(chunks, [[1], [2], [3]]);
    });

    it('should let go of the chunks of a drained result as they are recorded', async () => {
      const cache = createCache();
      const gate = Promise.withResolvers();
      const { released, chunkOf } = trackReleases();

      cache.populateConsumerCounts(['a'], () => undefined);

      async function* gen() {
        yield chunkOf(1);
        yield chunkOf(2);
        yield chunkOf(3);
        await gate.promise;
      }

      cache.store('a', gen());

      const draining = cache.drain('a');

      // The generator waits, past its chunks: the first is no longer held
      await collectGarbage(() => released.has(1));

      strictEqual(released.has(1), true);

      gate.resolve();
      await draining;
    });

    it('should let go of the chunks a reader has read, after the generator ended', async () => {
      const cache = createCache();
      const { released, chunkOf } = trackReleases();

      cache.populateConsumerCounts(['a'], () => undefined);

      async function* gen() {
        yield chunkOf(1);
        yield chunkOf(2);
        yield chunkOf(3);
      }

      cache.store('a', gen());

      // Its only read: no more readers can start
      const stream = await cache.stream('a');

      // The generator ends before any chunk is read
      await new Promise(resolve => setImmediate(resolve));

      const reader = stream[Symbol.asyncIterator]();
      const read = await readValues(reader, 2);

      await collectGarbage(() => released.has(1));

      strictEqual(released.has(1), true);

      const rest = await readValues(reader);

      // The last chunk goes once the reader is done, while it is still held
      await collectGarbage(() => released.has(3));

      const end = await reader.next();

      deepStrictEqual([...read, ...rest], [1, 2, 3]);
      strictEqual(end.done, true);
      strictEqual(released.has(3), true);
    });

    it('should let go of a chunk only once every streaming reader has read it', async () => {
      const cache = createCache();
      const { released, chunkOf } = trackReleases();

      // `x`, `y` and `z` all read `a`
      cache.populateConsumerCounts(['x', 'y', 'z'], name =>
        name === 'a' ? undefined : 'a'
      );

      async function* gen() {
        yield chunkOf(1);
        yield chunkOf(2);
        yield chunkOf(3);
      }

      cache.store('a', gen());

      const streams = [];

      // The third is the last read: no more readers can start
      for (let i = 0; i < 3; i++) {
        const stream = await cache.stream('a');

        streams.push(stream);
      }

      // The reader that falls behind started between the other two, so neither
      // the first reader nor the last one alone tells what all have read
      const [first, middle, last] = streams.map(stream =>
        stream[Symbol.asyncIterator]()
      );

      const firstRead = await readValues(first, 2);
      const lastRead = await readValues(last, 2);

      // `middle` has yet to read the first chunk
      await collectGarbage(() => released.has(1));

      strictEqual(released.has(1), false);

      const middleRead = await readValues(middle, 2);

      await collectGarbage(() => released.has(1));

      strictEqual(released.has(1), true);

      const firstRest = await readValues(first);
      const middleRest = await readValues(middle);
      const lastRest = await readValues(last);

      deepStrictEqual([...firstRead, ...firstRest], [1, 2, 3]);
      deepStrictEqual([...middleRead, ...middleRest], [1, 2, 3]);
      deepStrictEqual([...lastRead, ...lastRest], [1, 2, 3]);
    });

    it('should drain a non-streaming result', async () => {
      const cache = createCache();

      cache.populateConsumerCounts(['a'], () => undefined);
      cache.store('a', Promise.resolve({ value: 1 }));

      const drained = await cache.drain('a');

      strictEqual(drained, undefined);
      strictEqual(cache.has('a'), false);
    });

    it('should reject draining a generator that fails', async () => {
      const cache = createCache();

      cache.populateConsumerCounts(['a'], () => undefined);

      async function* gen() {
        yield [1];

        throw new Error('drained failure');
      }

      cache.store('a', gen());

      await rejects(cache.drain('a'), /drained failure/);
    });

    it('should count a stream as a read for eviction', async () => {
      const cache = createCache();

      cache.populateConsumerCounts(['a'], () => undefined);

      async function* gen() {
        yield [1];
      }

      cache.store('a', gen());

      const reader = await cache.stream('a');
      const chunks = await collectChunks(reader);

      deepStrictEqual(chunks, [[1]]);
      strictEqual(cache.has('a'), false);
    });
  });
});
