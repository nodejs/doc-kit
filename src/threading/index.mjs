import { Worker } from 'node:worker_threads';

/**
 * WorkerPool class to manage a pool of worker threads
 */
export default class WorkerPool {
  /** @private {SharedArrayBuffer} - Shared memory for active thread count */
  sharedBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
  /** @private {Int32Array} - A typed array to access shared memory */
  activeThreads = new Int32Array(this.sharedBuffer);
  /** @private {Array<Function>} - Queue of pending tasks */
  queue = [];

  /**
   * @param {string | URL} workerScript - Path to the worker script (relative to this file or absolute URL)
   * @param {number} threads - Maximum number of concurrent worker threads
   */
  constructor(workerScript = './generator-worker.mjs', threads = 1) {
    this.workerScript =
      workerScript instanceof URL
        ? workerScript
        : new URL(workerScript, import.meta.url);

    this.threads = threads;
  }

  /**
   * Gets the current active thread count.
   * @returns {number} The current active thread count.
   */
  getActiveThreadCount() {
    return Atomics.load(this.activeThreads, 0);
  }

  /**
   * Changes the active thread count atomically by a given delta.
   * @param {number} delta - The value to increment or decrement the active thread count by.
   */
  changeActiveThreadCount(delta) {
    Atomics.add(this.activeThreads, 0, delta);
  }

  /**
   * Runs a task in a worker thread with the given data.
   * @param {Object} workerData - Data to pass to the worker thread
   * @returns {Promise<any>} Resolves with the worker result, or rejects with an error
   */
  run(workerData) {
    return new Promise((resolve, reject) => {
      /**
       * Runs the worker thread and handles the result or error.
       * @private
       */
      const run = () => {
        this.changeActiveThreadCount(1);

        const worker = new Worker(this.workerScript, { workerData });

        worker.on('message', result => {
          this.changeActiveThreadCount(-1);
          this.processQueue();

          if (result?.error) {
            reject(new Error(result.error));
          } else {
            resolve(result);
          }
        });

        worker.on('error', err => {
          this.changeActiveThreadCount(-1);
          this.processQueue();
          reject(err);
        });
      };

      if (this.getActiveThreadCount() >= this.threads) {
        this.queue.push(run);
      } else {
        run();
      }
    });
  }

  /**
   * Run multiple tasks in parallel, distributing across worker threads.
   * @template T, R
   * @param {T[]} tasks - Array of task data to process
   * @returns {Promise<R[]>} Results in same order as input tasks
   */
  async runAll(tasks) {
    return Promise.all(tasks.map(task => this.run(task)));
  }

  /**
   * Process the worker thread queue to start the next available task.
   * @private
   */
  processQueue() {
    if (this.queue.length > 0 && this.getActiveThreadCount() < this.threads) {
      const next = this.queue.shift();

      if (next) {
        next();
      }
    }
  }
}
