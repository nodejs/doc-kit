import { deepStrictEqual, ok, rejects, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { loadGenerator } from '../../generators/loader.mjs';
import { CHUNKS_PER_THREAD } from '../constants.mjs';
import createWorkerPool from '../index.mjs';
import createParallelWorker from '../parallel.mjs';

const metadataGenerator = await loadGenerator('metadata');
const astJsGenerator = await loadGenerator('ast-js');

/**
 * Helper to collect all results from an async generator.
 *
 * @template T
 * @param {AsyncGenerator<T[], void, unknown>} generator
 * @returns {Promise<T[]>}
 */
async function collectStream(generator) {
  const results = [];

  for await (const chunk of generator) {
    results.push(...chunk);
  }

  return results;
}

/**
 * Helper to collect chunks (not flattened)
 *
 * @template T
 * @param {AsyncGenerator<T[], void, unknown>} generator
 * @returns {Promise<T[][]>}
 */
async function collectChunks(generator) {
  const chunks = [];

  for await (const chunk of generator) {
    chunks.push(chunk);
  }

  return chunks;
}

/**
 * Streams three times as many one-item chunks as two threads can run at once
 * through a pool that holds each task until it is settled, newest first, and
 * checks before each that as many run as there is room for: no more, and no
 * fewer while any are left to start. Settling the newest first holds back the
 * oldest chunk, so no result can be emitted until the last: the room must come
 * from the settling alone. The results still come out in submission order.
 * A stream that lost count of the held chunks would never end, so its tests
 * need a timeout.
 *
 * @param {(items: number[]) => number[] | AsyncIterable<number[]>} toInput
 * @returns {Promise<void>}
 */
async function checkChunksPerThread(toInput) {
  const limit = 2 * CHUNKS_PER_THREAD;
  const items = Array.from({ length: limit * 3 }, (_, index) => index);
  const started = [];
  const running = [];
  const pool = {
    run: task =>
      new Promise(resolve => {
        started.push(...task.input);
        running.push(() => resolve(task.input));
      }),
  };
  const worker = createParallelWorker('ast-js', astJsGenerator, pool, {
    threads: 2,
    chunkSize: 1,
  });

  const result = collectStream(worker.stream(toInput(items), {}));

  for (let settled = 0; settled < items.length; settled++) {
    await new Promise(resolve => setImmediate(resolve));

    strictEqual(running.length, Math.min(limit, items.length - settled));

    running.pop()();
  }

  const results = await result;

  deepStrictEqual(started, items);
  deepStrictEqual(results, items);
}

describe('createParallelWorker', () => {
  it('should create a ParallelWorker with stream method', async () => {
    const pool = createWorkerPool(2);
    const worker = createParallelWorker('metadata', metadataGenerator, pool, {
      threads: 2,
    });

    ok(worker);
    strictEqual(typeof worker.stream, 'function');

    await pool.destroy();
  });

  it('should handle empty items array', async () => {
    const pool = createWorkerPool(2);
    const worker = createParallelWorker('ast-js', astJsGenerator, pool, {
      threads: 2,
      chunkSize: 10,
    });

    const results = await collectStream(worker.stream([], [], {}));

    deepStrictEqual(results, []);

    await pool.destroy();
  });

  it('should distribute items to multiple worker threads', async () => {
    const pool = createWorkerPool(4);
    const worker = createParallelWorker('metadata', metadataGenerator, pool, {
      threads: 4,
      chunkSize: 1,
    });

    const mockInput = [
      {
        path: 'test1',
        tree: { type: 'root', children: [] },
      },
      {
        path: 'test2',
        tree: { type: 'root', children: [] },
      },
      {
        path: 'test3',
        tree: { type: 'root', children: [] },
      },
      {
        path: 'test4',
        tree: { type: 'root', children: [] },
      },
    ];

    const chunks = await collectChunks(worker.stream(mockInput, {}));

    strictEqual(chunks.length, 4);

    for (const chunk of chunks) {
      ok(Array.isArray(chunk));
    }

    await pool.destroy();
  });

  it('should yield one result per input chunk', async () => {
    const pool = createWorkerPool(2);
    const worker = createParallelWorker('metadata', metadataGenerator, pool, {
      threads: 2,
      chunkSize: 1,
    });

    const mockInput = [
      {
        path: 'test1',
        tree: { type: 'root', children: [] },
      },
      {
        path: 'test2',
        tree: { type: 'root', children: [] },
      },
    ];

    const chunks = await collectChunks(worker.stream(mockInput, {}));

    strictEqual(chunks.length, 2);

    await pool.destroy();
  });

  it('should work with single thread and items', async () => {
    const pool = createWorkerPool(2);
    const worker = createParallelWorker('metadata', metadataGenerator, pool, {
      threads: 2,
      chunkSize: 5,
    });

    const mockInput = [
      {
        path: 'test1',
        tree: { type: 'root', children: [] },
      },
    ];

    const chunks = await collectChunks(worker.stream(mockInput, {}));

    strictEqual(chunks.length, 1);
    ok(Array.isArray(chunks[0]));

    await pool.destroy();
  });

  it('should use sliceInput for metadata generator', async () => {
    const pool = createWorkerPool(2);
    const worker = createParallelWorker('metadata', metadataGenerator, pool, {
      threads: 2,
      chunkSize: 1,
    });

    const mockInput = [
      {
        path: 'test1',
        tree: { type: 'root', children: [] },
      },
      {
        path: 'test2',
        tree: { type: 'root', children: [] },
      },
    ];

    const chunks = await collectChunks(worker.stream(mockInput, {}));

    strictEqual(chunks.length, 2);

    await pool.destroy();
  });

  it('yields concurrent worker results in submission order', async () => {
    const resolvers = [];
    const pool = {
      run: task =>
        new Promise(resolve => {
          resolvers.push(() => resolve(task.input));
        }),
    };
    const worker = createParallelWorker('ast-js', astJsGenerator, pool, {
      threads: 2,
      chunkSize: 1,
    });

    const result = collectStream(worker.stream([0, 1, 2, 3, 4], {}));
    await Promise.resolve();

    // All five tasks start before any result is yielded, but finish in reverse.
    strictEqual(resolvers.length, 5);
    for (const resolve of resolvers.toReversed()) {
      resolve();
    }

    deepStrictEqual(await result, [0, 1, 2, 3, 4]);
  });

  it('propagates a later worker failure without an unhandled rejection', async () => {
    const tasks = [];
    const pool = {
      run: task =>
        new Promise((resolve, reject) => {
          tasks.push({ resolve, reject, input: task.input });
        }),
    };
    const worker = createParallelWorker('ast-js', astJsGenerator, pool, {
      threads: 2,
      chunkSize: 1,
    });

    const result = collectStream(worker.stream([0, 1, 2, 3], {}));
    await Promise.resolve();
    strictEqual(tasks.length, 4);

    tasks[2].reject(new Error('chunk failed'));
    for (const [index, task] of tasks.entries()) {
      if (index !== 2) {
        task.resolve(task.input);
      }
    }

    await rejects(result, /chunk failed/);
  });

  it(
    'should start a few chunks per thread at a time, and the next as each settles',
    { timeout: 10_000 },
    () => checkChunksPerThread(items => items)
  );

  it('should process one chunk at a time, in order, with a single thread', async () => {
    let running = 0;
    let mostRunning = 0;

    const generator = {
      name: 'sequential',
      async processChunk(items, indices) {
        mostRunning = Math.max(mostRunning, ++running);

        await new Promise(resolve => setImmediate(resolve));

        running--;

        return indices.map(index => items[index]);
      },
    };

    const worker = createParallelWorker('sequential', generator, null, {
      threads: 1,
      chunkSize: 2,
    });

    const chunks = await collectChunks(worker.stream([1, 2, 3, 4, 5], {}));

    strictEqual(mostRunning, 1);
    deepStrictEqual(chunks, [[1, 2], [3, 4], [5]]);
  });

  describe('with streamed batches', () => {
    it(
      'starts a batch before the next one arrives',
      // The second batch only arrives once the first result is read, so a
      // stream that waited for it would never give one
      { timeout: 10_000 },
      async () => {
        const started = [];
        const pool = {
          run: async task => {
            started.push(task.input);

            return task.input;
          },
        };
        const worker = createParallelWorker('ast-js', astJsGenerator, pool, {
          threads: 2,
          chunkSize: 2,
        });
        const gate = Promise.withResolvers();

        async function* batches() {
          yield [1, 2, 3];
          await gate.promise;
          yield [4];
        }

        const reader = worker.stream(batches(), {});
        const first = await reader.next();

        // The second batch hasn't arrived, but the first one's chunks ran
        deepStrictEqual(first.value, [1, 2]);
        deepStrictEqual(started, [[1, 2], [3]]);

        gate.resolve();

        const rest = await collectChunks(reader);

        deepStrictEqual(rest, [[3], [4]]);
      }
    );

    it(
      'yields in submission order across batches',
      // The test waits for every chunk to start, so it would wait forever on a
      // stream that held one back
      { timeout: 10_000 },
      async () => {
        const resolvers = [];
        const pool = {
          run: task =>
            new Promise(resolve => {
              resolvers.push(() => resolve(task.input));
            }),
        };
        const worker = createParallelWorker('ast-js', astJsGenerator, pool, {
          threads: 2,
          chunkSize: 1,
        });

        async function* batches() {
          yield [0, 1];
          yield [2];
        }

        const result = collectStream(worker.stream(batches(), {}));

        while (resolvers.length < 3) {
          await new Promise(resolve => setImmediate(resolve));
        }

        for (const resolve of resolvers.toReversed()) {
          resolve();
        }

        const results = await result;

        deepStrictEqual(results, [0, 1, 2]);
      }
    );

    it('throws a failure reading the batches after the chunks before it', async () => {
      const pool = { run: async task => task.input };
      const worker = createParallelWorker('ast-js', astJsGenerator, pool, {
        threads: 2,
        chunkSize: 1,
      });

      async function* batches() {
        yield [1, 2];
        throw new Error('source failed');
      }

      const chunks = [];

      await rejects(async () => {
        for await (const chunk of worker.stream(batches(), {})) {
          chunks.push(chunk);
        }
      }, /source failed/);

      deepStrictEqual(chunks, [[1], [2]]);
    });

    it(
      'starts a few chunks per thread at a time, across batches',
      { timeout: 10_000 },
      () =>
        checkChunksPerThread(async function* (items) {
          for (let index = 0; index < items.length; index += 5) {
            yield items.slice(index, index + 5);
          }
        })
    );

    it('runs each batch on this thread as it arrives with a single thread', async () => {
      const events = [];
      const generator = {
        name: 'sequential',
        async processChunk(items, indices) {
          events.push(`chunk ${indices.map(index => items[index])}`);

          return indices.map(index => items[index]);
        },
      };
      const worker = createParallelWorker('sequential', generator, null, {
        threads: 1,
        chunkSize: 2,
      });

      async function* batches() {
        events.push('batch 1');
        yield [1, 2, 3];
        events.push('batch 2');
        yield [4];
      }

      const chunks = await collectChunks(worker.stream(batches(), {}));

      deepStrictEqual(chunks, [[1, 2], [3], [4]]);
      deepStrictEqual(events, [
        'batch 1',
        'chunk 1,2',
        'chunk 3',
        'batch 2',
        'chunk 4',
      ]);
    });

    it('yields nothing for no batches', async () => {
      const worker = createParallelWorker('ast-js', astJsGenerator, null, {
        threads: 2,
        chunkSize: 1,
      });

      async function* batches() {}

      const chunks = await collectChunks(worker.stream(batches(), {}));

      deepStrictEqual(chunks, []);
    });
  });
});
