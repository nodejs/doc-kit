import { deepStrictEqual, ok, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import WorkerPool from '../index.mjs';

describe('WorkerPool', () => {
  // Use relative path from WorkerPool's location (src/threading/)
  const workerPath = './chunk-worker.mjs';

  it('should create a worker pool with specified thread count', () => {
    const pool = new WorkerPool(workerPath, 4);

    strictEqual(pool.threads, 4);
    strictEqual(pool.getActiveThreadCount(), 0);
  });

  it('should initialize with zero active threads', () => {
    const pool = new WorkerPool(workerPath, 2);

    strictEqual(pool.getActiveThreadCount(), 0);
  });

  it('should change active thread count atomically', () => {
    const pool = new WorkerPool(workerPath, 2);

    pool.changeActiveThreadCount(1);
    strictEqual(pool.getActiveThreadCount(), 1);

    pool.changeActiveThreadCount(2);
    strictEqual(pool.getActiveThreadCount(), 3);

    pool.changeActiveThreadCount(-1);
    strictEqual(pool.getActiveThreadCount(), 2);
  });

  it('should queue tasks when thread limit is reached', async () => {
    const pool = new WorkerPool(workerPath, 1);

    const task1 = pool.run({
      generatorName: 'ast-js',
      fullInput: [],
      itemIndices: [],
      options: {},
    });

    const task2 = pool.run({
      generatorName: 'ast-js',
      fullInput: [],
      itemIndices: [],
      options: {},
    });

    const results = await Promise.all([task1, task2]);

    ok(Array.isArray(results));
    strictEqual(results.length, 2);
  });

  it('should run multiple tasks in parallel with runAll', async () => {
    const pool = new WorkerPool(workerPath, 2);

    const tasks = [
      {
        generatorName: 'ast-js',
        fullInput: [],
        itemIndices: [],
        options: {},
      },
      {
        generatorName: 'ast-js',
        fullInput: [],
        itemIndices: [],
        options: {},
      },
    ];

    const results = await pool.runAll(tasks);

    ok(Array.isArray(results));
    strictEqual(results.length, 2);
  });

  it('should handle empty task array', async () => {
    const pool = new WorkerPool(workerPath, 2);

    const results = await pool.runAll([]);

    deepStrictEqual(results, []);
  });
});
