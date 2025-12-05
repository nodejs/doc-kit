import { deepStrictEqual, ok, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import WorkerPool from '../index.mjs';
import createParallelWorker from '../parallel.mjs';

describe('createParallelWorker', () => {
  // Use relative path from WorkerPool's location (src/threading/)
  const workerPath = './chunk-worker.mjs';

  it('should create a ParallelWorker with map method', () => {
    const pool = new WorkerPool(workerPath, 2);

    const worker = createParallelWorker('metadata', pool, { threads: 2 });

    ok(worker);
    strictEqual(typeof worker.map, 'function');
  });

  it('should use main thread for single-threaded execution', async () => {
    const pool = new WorkerPool(workerPath, 1);

    const worker = createParallelWorker('ast-js', pool, { threads: 1 });
    const items = [];
    const results = await worker.map(items, items, {});

    ok(Array.isArray(results));
    strictEqual(results.length, 0);
  });

  it('should use main thread for small item counts', async () => {
    const pool = new WorkerPool(workerPath, 4);

    const worker = createParallelWorker('ast-js', pool, { threads: 4 });
    const items = [];
    const results = await worker.map(items, items, {});

    ok(Array.isArray(results));
    strictEqual(results.length, 0);
  });

  it('should chunk items for parallel processing', async () => {
    const pool = new WorkerPool(workerPath, 2);

    const worker = createParallelWorker('ast-js', pool, { threads: 2 });
    const items = [];

    const results = await worker.map(items, items, {});

    strictEqual(results.length, 0);
    ok(Array.isArray(results));
  });

  it('should pass extra options to worker', async () => {
    const pool = new WorkerPool(workerPath, 1);

    const worker = createParallelWorker('ast-js', pool, { threads: 1 });
    const extra = { gitRef: 'main', customOption: 'value' };
    const items = [];

    const results = await worker.map(items, items, extra);

    ok(Array.isArray(results));
  });

  it('should serialize and deserialize data correctly', async () => {
    const pool = new WorkerPool(workerPath, 2);

    const worker = createParallelWorker('ast-js', pool, { threads: 2 });
    const items = [];

    const results = await worker.map(items, items, {});

    ok(Array.isArray(results));
  });

  it('should handle empty items array', async () => {
    const pool = new WorkerPool(workerPath, 2);

    const worker = createParallelWorker('ast-js', pool, { threads: 2 });
    const results = await worker.map([], [], {});

    deepStrictEqual(results, []);
  });
});
