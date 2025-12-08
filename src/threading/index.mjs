import { Worker } from 'node:worker_threads';

import logger from '../logger/index.mjs';

const poolLogger = logger.child('WorkerPool');

/**
 * WorkerPool manages a pool of reusable Node.js worker threads for parallel processing.
 * Workers are spawned on-demand and kept alive to process multiple tasks, avoiding
 * the overhead of creating new workers for each task.
 *
 * Tasks are distributed to available workers. If all workers are busy, tasks are
 * queued and processed in FIFO order as workers become free.
 *
 * @example
 * const pool = new WorkerPool('./my-worker.mjs', 4);
 * const result = await pool.run({ task: 'process', data: [1, 2, 3] });
 */
export default class WorkerPool {
  /**
   * Pool of idle workers ready to accept tasks.
   * @type {Worker[]}
   */
  idleWorkers = [];

  /**
   * Set of all spawned workers (for cleanup).
   * @type {Set<Worker>}
   */
  allWorkers = new Set();

  /**
   * Number of workers currently being spawned (to prevent over-spawning).
   * @type {number}
   */
  spawningCount = 0;

  /**
   * Queue of pending tasks waiting for available workers.
   * Each entry contains { workerData, resolve, reject }.
   * @type {Array<{ workerData: object, resolve: Function, reject: Function }>}
   */
  queue = [];

  /**
   * URL to the worker script file.
   * @type {URL}
   */
  workerScript;

  /**
   * Maximum number of concurrent worker threads.
   * @type {number}
   */
  threads;

  /**
   * Creates a new WorkerPool instance.
   *
   * @param {string | URL} workerScript - Path to worker script file (relative to this module or absolute URL)
   * @param {number} [threads=1] - Maximum concurrent worker threads
   */
  constructor(workerScript = './generator-worker.mjs', threads = 1) {
    this.workerScript =
      workerScript instanceof URL
        ? workerScript
        : new URL(workerScript, import.meta.url);

    this.threads = threads;

    poolLogger.debug(`WorkerPool initialized`, { threads, workerScript });
  }

  /**
   * Spawns a new worker and sets up message handling.
   * The worker will be reused for multiple tasks.
   *
   * @private
   * @returns {Worker} The newly spawned worker
   */
  spawnWorker() {
    const worker = new Worker(this.workerScript);

    this.allWorkers.add(worker);

    worker.on('message', result => {
      // Get the current task before clearing it
      const currentTask = worker.currentTask;

      worker.currentTask = null;

      // Resolve/reject the completed task first
      if (currentTask) {
        if (result?.error) {
          currentTask.reject(new Error(result.error));
        } else {
          currentTask.resolve(result);
        }
      }

      // Mark worker as idle and process any queued work
      this.idleWorkers.push(worker);
      this.processQueue();
    });

    worker.on('error', err => {
      poolLogger.debug(`Worker error`, { error: err.message });

      // Remove failed worker from pool
      this.allWorkers.delete(worker);

      const idx = this.idleWorkers.indexOf(worker);

      if (idx !== -1) {
        this.idleWorkers.splice(idx, 1);
      }

      // Reject current task if any
      if (worker.currentTask) {
        worker.currentTask.reject(err);

        worker.currentTask = null;
      }
    });

    return worker;
  }

  /**
   * Executes a task on a specific worker.
   *
   * @private
   * @param {Worker} worker - Worker to execute the task
   * @param {object} workerData - Data to send to the worker
   * @param {Function} resolve - Promise resolve function
   * @param {Function} reject - Promise reject function
   */
  executeTask(worker, workerData, resolve, reject) {
    worker.currentTask = { resolve, reject };

    worker.postMessage(workerData);
  }

  /**
   * Runs a task in a worker thread. If all workers are busy, the task
   * is queued and executed when a worker becomes available.
   *
   * Workers are reused across tasks for efficiency.
   *
   * @template T
   * @param {object} workerData - Data to pass to the worker thread
   * @param {string} workerData.generatorName - Name of the generator to run
   * @param {unknown} workerData.fullInput - Full input data for context
   * @param {number[]} workerData.itemIndices - Indices of items to process
   * @param {object} workerData.options - Generator options
   * @returns {Promise<T>} Resolves with the worker result, rejects on error
   */
  run(workerData) {
    return new Promise((resolve, reject) => {
      // Always queue the task first
      this.queue.push({ workerData, resolve, reject });

      // Then try to process the queue
      this.processQueue();
    });
  }

  /**
   * Processes queued tasks by assigning them to available or new workers.
   * Spawns all needed workers in parallel to minimize startup latency.
   *
   * @private
   */
  processQueue() {
    // First, assign tasks to any idle workers
    while (this.queue.length > 0 && this.idleWorkers.length > 0) {
      const worker = this.idleWorkers.pop();

      const { workerData, resolve, reject } = this.queue.shift();

      poolLogger.debug(`Task started (reusing worker)`, {
        generator: workerData.generatorName,
        idleWorkers: this.idleWorkers.length,
        totalWorkers: this.allWorkers.size,
        queueSize: this.queue.length,
      });

      this.executeTask(worker, workerData, resolve, reject);
    }

    // Calculate how many new workers we need (account for workers being spawned)
    const totalPendingWorkers = this.allWorkers.size + this.spawningCount;

    const workersNeeded = Math.min(
      this.queue.length,
      this.threads - totalPendingWorkers
    );

    if (workersNeeded > 0) {
      poolLogger.debug(`Spawning workers in parallel`, {
        workersNeeded,
        currentWorkers: this.allWorkers.size,
        spawning: this.spawningCount,
        maxThreads: this.threads,
        queueSize: this.queue.length,
      });

      // Spawn all needed workers in parallel (don't await, just fire them off)
      for (let i = 0; i < workersNeeded; i++) {
        const { workerData, resolve, reject } = this.queue.shift();

        // Track that we're spawning a worker
        this.spawningCount++;

        // Use setImmediate to spawn workers concurrently rather than blocking
        setImmediate(() => {
          this.spawningCount--;

          const worker = this.spawnWorker();

          this.executeTask(worker, workerData, resolve, reject);
        });
      }
    }

    if (this.queue.length > 0) {
      poolLogger.debug(`Tasks queued (waiting for workers)`, {
        queueSize: this.queue.length,
        totalWorkers: this.allWorkers.size,
      });
    }
  }

  /**
   * Terminates all workers in the pool.
   * Kills workers immediately without waiting for graceful shutdown.
   */
  terminate() {
    for (const worker of this.allWorkers) {
      worker.terminate();
    }

    this.allWorkers.clear();
    this.idleWorkers = [];
    this.queue = [];
    this.spawningCount = 0;
  }
}
