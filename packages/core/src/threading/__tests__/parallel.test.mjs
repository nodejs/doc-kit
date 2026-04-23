import { deepStrictEqual, ok, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { loadGenerator } from '../../loader.mjs';
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

const metadataSpecifier = '@doc-kittens/internal/metadata';
const metadataGenerator = await loadGenerator(metadataSpecifier);
const astJsSpecifier = '@doc-kittens/internal/ast-js';
const astJsGenerator = await loadGenerator(astJsSpecifier);

describe('createParallelWorker', () => {
  it('should create a ParallelWorker with stream method', async () => {
    const pool = createWorkerPool(2);
    const worker = createParallelWorker(
      metadataSpecifier,
      metadataGenerator,
      pool,
      { threads: 2 }
    );

    ok(worker);
    strictEqual(typeof worker.stream, 'function');

    await pool.destroy();
  });

  it('should handle empty items array', async () => {
    const pool = createWorkerPool(2);
    const worker = createParallelWorker(astJsSpecifier, astJsGenerator, pool, {
      threads: 2,
      chunkSize: 10,
    });

    const results = await collectStream(worker.stream([], [], {}));

    deepStrictEqual(results, []);

    await pool.destroy();
  });

  it('should distribute items to multiple worker threads', async () => {
    const pool = createWorkerPool(4);
    const worker = createParallelWorker(
      metadataSpecifier,
      metadataGenerator,
      pool,
      {
        threads: 4,
        chunkSize: 1,
      }
    );

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

  it('should yield results as chunks complete', async () => {
    const pool = createWorkerPool(2);
    const worker = createParallelWorker(
      metadataSpecifier,
      metadataGenerator,
      pool,
      {
        threads: 2,
        chunkSize: 1,
      }
    );

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
    const worker = createParallelWorker(
      metadataSpecifier,
      metadataGenerator,
      pool,
      {
        threads: 2,
        chunkSize: 5,
      }
    );

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
    const worker = createParallelWorker(
      metadataSpecifier,
      metadataGenerator,
      pool,
      {
        threads: 2,
        chunkSize: 1,
      }
    );

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
});
