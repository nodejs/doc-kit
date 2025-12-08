import { deepStrictEqual, ok, rejects, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import WorkerPool from '../index.mjs';

describe('WorkerPool', () => {
  // Use relative path from WorkerPool's location (src/threading/)
  const workerPath = './chunk-worker.mjs';

  it('should create a worker pool with specified thread count', () => {
    const pool = new WorkerPool(workerPath, 4);

    strictEqual(pool.threads, 4);
    strictEqual(pool.allWorkers.size, 0);
  });

  it('should initialize with no workers', () => {
    const pool = new WorkerPool(workerPath, 2);

    strictEqual(pool.allWorkers.size, 0);
    strictEqual(pool.idleWorkers.length, 0);
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

    await pool.terminate();
  });

  it('should run multiple tasks via individual run calls', async () => {
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

    const results = await Promise.all(tasks.map(task => pool.run(task)));

    ok(Array.isArray(results));
    strictEqual(results.length, 2);

    await pool.terminate();
  });

  it('should handle default thread count', () => {
    const pool = new WorkerPool(workerPath);

    strictEqual(pool.threads, 1);
  });

  it('should accept URL for worker script', () => {
    const url = new URL('./chunk-worker.mjs', import.meta.url);
    const pool = new WorkerPool(url, 2);

    ok(pool.workerScript instanceof URL);
    strictEqual(pool.threads, 2);
  });

  it('should process queued tasks after completion', async () => {
    const pool = new WorkerPool(workerPath, 1);

    // Queue up 3 tasks with only 1 thread
    const tasks = [];

    for (let i = 0; i < 3; i++) {
      tasks.push(
        pool.run({
          generatorName: 'ast-js',
          fullInput: [],
          itemIndices: [],
          options: {},
        })
      );
    }

    // All should complete even with only 1 thread
    const results = await Promise.all(tasks);

    strictEqual(results.length, 3);

    await pool.terminate();
  });

  it('should reject on worker error with result.error', async () => {
    const pool = new WorkerPool(workerPath, 1);

    // Using an invalid generator name should cause an error
    await rejects(async () => {
      await pool.run({
        generatorName: 'nonexistent-generator',
        fullInput: [],
        itemIndices: [0],
        options: {},
      });
    }, Error);

    await pool.terminate();
  });

  it('should handle concurrent tasks up to thread limit', async () => {
    const pool = new WorkerPool(workerPath, 4);

    // Run 4 tasks concurrently (at thread limit)
    const tasks = Array.from({ length: 4 }, () =>
      pool.run({
        generatorName: 'ast-js',
        fullInput: [],
        itemIndices: [],
        options: {},
      })
    );

    const results = await Promise.all(tasks);

    strictEqual(results.length, 4);
    results.forEach(r => ok(Array.isArray(r)));

    await pool.terminate();
  });

  it('should return results correctly from workers', async () => {
    const pool = new WorkerPool(workerPath, 2);

    const result = await pool.run({
      generatorName: 'ast-js',
      fullInput: [],
      itemIndices: [],
      options: {},
    });

    ok(Array.isArray(result));

    await pool.terminate();
  });

  it('should reuse workers for multiple tasks', async () => {
    const pool = new WorkerPool(workerPath, 2);

    // Run first batch
    await pool.run({
      generatorName: 'ast-js',
      fullInput: [],
      itemIndices: [],
      options: {},
    });

    // Workers should now be idle
    strictEqual(pool.idleWorkers.length, 1);
    strictEqual(pool.allWorkers.size, 1);

    // Run another task - should reuse idle worker
    await pool.run({
      generatorName: 'ast-js',
      fullInput: [],
      itemIndices: [],
      options: {},
    });

    // Still same number of workers
    strictEqual(pool.allWorkers.size, 1);

    await pool.terminate();
  });

  it('should terminate all workers', async () => {
    const pool = new WorkerPool(workerPath, 2);

    // Spawn some workers
    await Promise.all([
      pool.run({
        generatorName: 'ast-js',
        fullInput: [],
        itemIndices: [],
        options: {},
      }),
      pool.run({
        generatorName: 'ast-js',
        fullInput: [],
        itemIndices: [],
        options: {},
      }),
    ]);

    strictEqual(pool.allWorkers.size, 2);

    await pool.terminate();

    strictEqual(pool.allWorkers.size, 0);
    strictEqual(pool.idleWorkers.length, 0);
  });

  it('should clear queue on terminate', async () => {
    const pool = new WorkerPool(workerPath, 1);

    // Start one task to occupy the single worker
    const runningTask = pool.run({
      generatorName: 'ast-js',
      fullInput: [],
      itemIndices: [],
      options: {},
    });

    // Queue more tasks than threads available
    pool.run({
      generatorName: 'ast-js',
      fullInput: [],
      itemIndices: [],
      options: {},
    });

    pool.run({
      generatorName: 'ast-js',
      fullInput: [],
      itemIndices: [],
      options: {},
    });

    // Wait for first task to finish
    await runningTask;

    // Terminate should clear any remaining queue
    await pool.terminate();

    strictEqual(pool.queue.length, 0);
  });

  it('should handle multiple terminates gracefully', async () => {
    const pool = new WorkerPool(workerPath, 2);

    await pool.run({
      generatorName: 'ast-js',
      fullInput: [],
      itemIndices: [],
      options: {},
    });

    await pool.terminate();
    await pool.terminate(); // Second terminate should not throw

    strictEqual(pool.allWorkers.size, 0);
  });

  it('should spawn workers up to thread limit only', async () => {
    const pool = new WorkerPool(workerPath, 2);

    // Queue 4 tasks with limit of 2 threads
    const tasks = Array.from({ length: 4 }, () =>
      pool.run({
        generatorName: 'ast-js',
        fullInput: [],
        itemIndices: [],
        options: {},
      })
    );

    await Promise.all(tasks);

    // After all tasks complete, should have at most 2 workers
    ok(pool.allWorkers.size <= 2);

    await pool.terminate();
  });

  it('should process tasks in FIFO order when queued', async () => {
    const pool = new WorkerPool(workerPath, 1);

    const order = [];

    // Queue 3 tasks with single thread
    const task1 = pool
      .run({
        generatorName: 'ast-js',
        fullInput: [],
        itemIndices: [],
        options: {},
      })
      .then(() => order.push(1));

    const task2 = pool
      .run({
        generatorName: 'ast-js',
        fullInput: [],
        itemIndices: [],
        options: {},
      })
      .then(() => order.push(2));

    const task3 = pool
      .run({
        generatorName: 'ast-js',
        fullInput: [],
        itemIndices: [],
        options: {},
      })
      .then(() => order.push(3));

    await Promise.all([task1, task2, task3]);

    // Tasks should complete in order they were queued
    deepStrictEqual(order, [1, 2, 3]);

    await pool.terminate();
  });
});
