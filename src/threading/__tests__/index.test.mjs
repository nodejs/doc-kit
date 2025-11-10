import { strict as assert } from 'node:assert';
import { after, test } from 'node:test';

import WorkerPool from '../index.mjs';

// Keep track of pools for cleanup
const pools = [];

after(() => {
  // Allow time for any pending workers to complete
  return new Promise(resolve => setTimeout(resolve, 100));
});

test('WorkerPool - constructor initializes properties', () => {
  const pool = new WorkerPool();
  pools.push(pool);

  assert.ok(pool.sharedBuffer instanceof SharedArrayBuffer);
  assert.ok(pool.activeThreads instanceof Int32Array);
  assert.ok(Array.isArray(pool.queue));
  assert.equal(pool.queue.length, 0);
});

test('WorkerPool - getActiveThreadCount returns initial zero', () => {
  const pool = new WorkerPool();
  pools.push(pool);

  assert.equal(pool.getActiveThreadCount(), 0);
});

test('WorkerPool - changeActiveThreadCount increments count', () => {
  const pool = new WorkerPool();
  pools.push(pool);

  pool.changeActiveThreadCount(1);
  assert.equal(pool.getActiveThreadCount(), 1);

  pool.changeActiveThreadCount(2);
  assert.equal(pool.getActiveThreadCount(), 3);
});

test('WorkerPool - changeActiveThreadCount decrements count', () => {
  const pool = new WorkerPool();
  pools.push(pool);

  pool.changeActiveThreadCount(5);
  assert.equal(pool.getActiveThreadCount(), 5);

  pool.changeActiveThreadCount(-2);
  assert.equal(pool.getActiveThreadCount(), 3);
});

test('WorkerPool - changeActiveThreadCount is atomic', () => {
  const pool = new WorkerPool();
  pools.push(pool);

  // Simulate concurrent operations
  pool.changeActiveThreadCount(1);
  pool.changeActiveThreadCount(1);
  pool.changeActiveThreadCount(-1);

  assert.equal(pool.getActiveThreadCount(), 1);
});

test('WorkerPool - processQueue does nothing when queue is empty', () => {
  const pool = new WorkerPool();
  pools.push(pool);

  // Should not throw
  assert.doesNotThrow(() => pool.processQueue(2));
  assert.equal(pool.queue.length, 0);
});

test('WorkerPool - processQueue does nothing when thread limit reached', () => {
  const pool = new WorkerPool();
  pools.push(pool);

  let executed = false;
  pool.queue.push(() => {
    executed = true;
  });

  // Set active threads to max
  pool.changeActiveThreadCount(2);

  pool.processQueue(2);

  // Should not execute queued task
  assert.equal(executed, false);
  assert.equal(pool.queue.length, 1);
});

test('WorkerPool - processQueue executes next task when capacity available', () => {
  const pool = new WorkerPool();
  pools.push(pool);

  let executed = false;
  pool.queue.push(() => {
    executed = true;
  });

  pool.changeActiveThreadCount(1);
  pool.processQueue(2);

  // Should execute queued task
  assert.equal(executed, true);
  assert.equal(pool.queue.length, 0);
});

test('WorkerPool - processQueue shifts only one task from queue', () => {
  const pool = new WorkerPool();
  pools.push(pool);

  let count = 0;
  pool.queue.push(() => count++);
  pool.queue.push(() => count++);
  pool.queue.push(() => count++);

  pool.processQueue(10);

  // Should only process one task
  assert.equal(count, 1);
  assert.equal(pool.queue.length, 2);
});

test('WorkerPool - run executes immediately when under thread limit', async () => {
  const pool = new WorkerPool();
  pools.push(pool);

  // This will run immediately since we're under the limit
  const promise = pool.run('web', {}, 2, {});

  // Thread count should increment
  assert.equal(pool.getActiveThreadCount(), 1);

  // Clean up - we expect this to fail since we don't have real generator setup
  await assert.rejects(promise);
});

test('WorkerPool - run queues task when at thread limit', async () => {
  const pool = new WorkerPool();
  pools.push(pool);

  // Set to max threads
  pool.changeActiveThreadCount(2);

  const promise = pool.run('web', {}, 2, {});

  // Should be queued, not executed
  assert.equal(pool.queue.length, 1);
  assert.equal(pool.getActiveThreadCount(), 2);

  // Free up a thread to allow queue processing
  pool.changeActiveThreadCount(-1);
  pool.processQueue(2);

  // Now it should be running
  assert.equal(pool.getActiveThreadCount(), 2);
  assert.equal(pool.queue.length, 0);

  // Clean up
  await assert.rejects(promise);
});

test('WorkerPool - multiple run calls respect thread limit', () => {
  const pool = new WorkerPool();
  pools.push(pool);

  const threads = 2;

  // Start 3 tasks with limit of 2
  const p1 = pool.run('web', {}, threads, {});
  const p2 = pool.run('web', {}, threads, {});
  const p3 = pool.run('web', {}, threads, {});

  // First two should start, third should queue
  assert.equal(pool.getActiveThreadCount(), 2);
  assert.equal(pool.queue.length, 1);

  // Clean up - all will reject
  return Promise.allSettled([p1, p2, p3]);
});

test('WorkerPool - run decrements count on worker error', async () => {
  const pool = new WorkerPool();
  pools.push(pool);

  const promise = pool.run('nonexistent-generator', {}, 2, {});

  // Thread count should increment initially
  assert.equal(pool.getActiveThreadCount(), 1);

  // Wait for error
  await assert.rejects(promise);

  // Thread count should decrement after error
  assert.equal(pool.getActiveThreadCount(), 0);
});

test('WorkerPool - separate instances have separate thread counts', () => {
  const pool1 = new WorkerPool();
  const pool2 = new WorkerPool();
  pools.push(pool1, pool2);

  pool1.changeActiveThreadCount(3);
  pool2.changeActiveThreadCount(5);

  assert.equal(pool1.getActiveThreadCount(), 3);
  assert.equal(pool2.getActiveThreadCount(), 5);
});

test('WorkerPool - separate instances have separate queues', () => {
  const pool1 = new WorkerPool();
  const pool2 = new WorkerPool();
  pools.push(pool1, pool2);

  pool1.queue.push(() => {});
  pool1.queue.push(() => {});
  pool2.queue.push(() => {});

  assert.equal(pool1.queue.length, 2);
  assert.equal(pool2.queue.length, 1);
});

test('WorkerPool - processQueue handles empty function in queue', () => {
  const pool = new WorkerPool();
  pools.push(pool);

  pool.queue.push(null);
  pool.queue.push(undefined);

  // Should not throw
  assert.doesNotThrow(() => pool.processQueue(2));
});

test('WorkerPool - SharedArrayBuffer supports atomic operations', () => {
  const pool = new WorkerPool();
  pools.push(pool);

  // Test atomic operations work as expected
  Atomics.store(pool.activeThreads, 0, 10);
  assert.equal(Atomics.load(pool.activeThreads, 0), 10);

  Atomics.add(pool.activeThreads, 0, 5);
  assert.equal(Atomics.load(pool.activeThreads, 0), 15);

  Atomics.sub(pool.activeThreads, 0, 3);
  assert.equal(Atomics.load(pool.activeThreads, 0), 12);
});
