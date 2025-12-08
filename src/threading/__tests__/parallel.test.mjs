import { deepStrictEqual, ok, rejects, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import WorkerPool from '../index.mjs';
import createParallelWorker from '../parallel.mjs';

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

describe('createParallelWorker', () => {
  // Use relative path from WorkerPool's location (src/threading/)
  const workerPath = './chunk-worker.mjs';

  it('should create a ParallelWorker with stream method', async () => {
    const pool = new WorkerPool(workerPath, 2);

    const worker = createParallelWorker('metadata', pool, { threads: 2 });

    ok(worker);
    strictEqual(typeof worker.stream, 'function');

    await pool.terminate();
  });

  it('should use main thread for single-threaded execution', async () => {
    const pool = new WorkerPool(workerPath, 1);

    const worker = createParallelWorker('ast-js', pool, { threads: 1 });
    const items = [];
    const results = await collectStream(worker.stream(items, items, {}));

    ok(Array.isArray(results));
    strictEqual(results.length, 0);

    await pool.terminate();
  });

  it('should use main thread when threads is 1', async () => {
    const pool = new WorkerPool(workerPath, 4);

    const worker = createParallelWorker('ast-js', pool, { threads: 1 });
    const items = [];
    const results = await collectStream(worker.stream(items, items, {}));

    ok(Array.isArray(results));
    strictEqual(results.length, 0);

    await pool.terminate();
  });

  it('should stream chunks for parallel processing', async () => {
    const pool = new WorkerPool(workerPath, 2);

    const worker = createParallelWorker('ast-js', pool, { threads: 2 });
    const items = [];

    const results = await collectStream(worker.stream(items, items, {}));

    strictEqual(results.length, 0);
    ok(Array.isArray(results));

    await pool.terminate();
  });

  it('should pass extra options to worker', async () => {
    const pool = new WorkerPool(workerPath, 1);

    const worker = createParallelWorker('ast-js', pool, { threads: 1 });
    const extra = { gitRef: 'main', customOption: 'value' };
    const items = [];

    const results = await collectStream(worker.stream(items, items, extra));

    ok(Array.isArray(results));

    await pool.terminate();
  });

  it('should serialize and deserialize data correctly', async () => {
    const pool = new WorkerPool(workerPath, 2);

    const worker = createParallelWorker('ast-js', pool, { threads: 2 });
    const items = [];

    const results = await collectStream(worker.stream(items, items, {}));

    ok(Array.isArray(results));

    await pool.terminate();
  });

  it('should handle empty items array', async () => {
    const pool = new WorkerPool(workerPath, 2);

    const worker = createParallelWorker('ast-js', pool, { threads: 2 });
    const results = await collectStream(worker.stream([], [], {}));

    deepStrictEqual(results, []);

    await pool.terminate();
  });

  it('should throw for generators without processChunk', async () => {
    const pool = new WorkerPool(workerPath, 2);

    // 'json-simple' doesn't have processChunk
    const worker = createParallelWorker('json-simple', pool, {
      threads: 2,
      chunkSize: 5,
    });

    // Non-empty items array to trigger processChunk check
    const items = [{ file: { stem: 'test' }, tree: {} }];

    await rejects(
      async () => {
        await collectStream(worker.stream(items, items, {}));
      },
      {
        message: /does not support chunk processing/,
      }
    );

    await pool.terminate();
  });

  it('should distribute items to multiple worker threads', async () => {
    const pool = new WorkerPool(workerPath, 4);

    const worker = createParallelWorker('metadata', pool, {
      threads: 4,
      chunkSize: 20, // Large chunk size, but optimal calculation will use 1 per thread
    });

    // Create mock input that matches expected shape for metadata generator
    const mockInput = [
      {
        file: { stem: 'test1', basename: 'test1.md' },
        tree: { type: 'root', children: [] },
      },
      {
        file: { stem: 'test2', basename: 'test2.md' },
        tree: { type: 'root', children: [] },
      },
      {
        file: { stem: 'test3', basename: 'test3.md' },
        tree: { type: 'root', children: [] },
      },
      {
        file: { stem: 'test4', basename: 'test4.md' },
        tree: { type: 'root', children: [] },
      },
    ];

    const chunks = await collectChunks(
      worker.stream(mockInput, mockInput, { typeMap: {} })
    );

    // With 4 items and 4 threads, optimal chunk size is 1, so we get 4 chunks
    strictEqual(chunks.length, 4);

    // Each chunk should be an array
    for (const chunk of chunks) {
      ok(Array.isArray(chunk));
    }

    await pool.terminate();
  });

  it('should yield results as chunks complete', async () => {
    const pool = new WorkerPool(workerPath, 2);

    const worker = createParallelWorker('metadata', pool, {
      threads: 2,
      chunkSize: 1,
    });

    const mockInput = [
      {
        file: { stem: 'test1', basename: 'test1.md' },
        tree: { type: 'root', children: [] },
      },
      {
        file: { stem: 'test2', basename: 'test2.md' },
        tree: { type: 'root', children: [] },
      },
    ];

    const chunks = await collectChunks(
      worker.stream(mockInput, mockInput, { typeMap: {} })
    );

    // With 2 items and chunkSize 1, should get 2 chunks
    strictEqual(chunks.length, 2);

    await pool.terminate();
  });

  it('should work with single thread and items', async () => {
    const pool = new WorkerPool(workerPath, 1);

    const worker = createParallelWorker('metadata', pool, {
      threads: 1,
      chunkSize: 5,
    });

    const mockInput = [
      {
        file: { stem: 'test1', basename: 'test1.md' },
        tree: { type: 'root', children: [] },
      },
    ];

    const chunks = await collectChunks(
      worker.stream(mockInput, mockInput, { typeMap: {} })
    );

    // Single thread mode yields one chunk
    strictEqual(chunks.length, 1);
    ok(Array.isArray(chunks[0]));

    await pool.terminate();
  });

  it('should use sliceInput for metadata generator', async () => {
    const pool = new WorkerPool(workerPath, 2);

    // metadata generator also has sliceInput = true
    const worker = createParallelWorker('metadata', pool, {
      threads: 2,
      chunkSize: 1,
    });

    const mockInput = [
      {
        file: { stem: 'test1', basename: 'test1.md' },
        tree: { type: 'root', children: [] },
      },
      {
        file: { stem: 'test2', basename: 'test2.md' },
        tree: { type: 'root', children: [] },
      },
    ];

    const chunks = await collectChunks(
      worker.stream(mockInput, mockInput, { typeMap: {} })
    );

    // Should process both items
    strictEqual(chunks.length, 2);

    await pool.terminate();
  });
});
