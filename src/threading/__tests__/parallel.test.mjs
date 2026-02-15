import { deepStrictEqual, ok, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import createWorkerPool from '../index.mjs';
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
  it('should create a ParallelWorker with stream method', async () => {
    const pool = createWorkerPool(2);
    const worker = await createParallelWorker('metadata', pool, { threads: 2 });

    ok(worker);
    strictEqual(typeof worker.stream, 'function');

    await pool.destroy();
  });

  it('should handle empty items array', async () => {
    const pool = createWorkerPool(2);
    const worker = await createParallelWorker('ast-js', pool, {
      threads: 2,
      chunkSize: 10,
    });

    const results = await collectStream(worker.stream([], [], {}));

    deepStrictEqual(results, []);

    await pool.destroy();
  });

  it('should distribute items to multiple worker threads', async () => {
    const pool = createWorkerPool(4);
    const worker = await createParallelWorker('metadata', pool, {
      threads: 4,
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

    strictEqual(chunks.length, 4);

    for (const chunk of chunks) {
      ok(Array.isArray(chunk));
    }

    await pool.destroy();
  });

  it('should yield results as chunks complete', async () => {
    const pool = createWorkerPool(2);
    const worker = await createParallelWorker('metadata', pool, {
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

    strictEqual(chunks.length, 2);

    await pool.destroy();
  });

  it('should work with single thread and items', async () => {
    const pool = createWorkerPool(2);
    const worker = await createParallelWorker('metadata', pool, {
      threads: 2,
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

    strictEqual(chunks.length, 1);
    ok(Array.isArray(chunks[0]));

    await pool.destroy();
  });

  it('should use sliceInput for metadata generator', async () => {
    const pool = createWorkerPool(2);
    const worker = await createParallelWorker('metadata', pool, {
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

    strictEqual(chunks.length, 2);

    await pool.destroy();
  });
});
