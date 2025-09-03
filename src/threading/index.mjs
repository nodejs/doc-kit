import { Worker } from 'node:worker_threads';

import logger from '../logger/index.mjs';

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
   * Runs a generator within a worker thread.
   * @param {string} name - The name of the generator to execute
   * @param {any} dependencyOutput - Input data for the generator
   * @param {number} threads - Maximum number of threads to run concurrently
   * @param {Object} extra - Additional options for the generator
   * @returns {Promise<any>} Resolves with the generator result, or rejects with an error
   */
  run(name, dependencyOutput, threads, extra) {
    return new Promise((resolve, reject) => {
      /**
       * Function to run the generator in a worker thread
       */
      const run = () => {
        this.changeActiveThreadCount(1);

        // Create and start the worker thread
        const worker = new Worker(new URL('./worker.mjs', import.meta.url), {
          workerData: { name, dependencyOutput, extra },
        });

        // Handle worker thread messages (result or error)
        worker.on('message', message => {
          switch (message.type) {
            case 'response':
              this.changeActiveThreadCount(-1);
              this.processQueue(threads);

              if (message?.error) {
                reject(message.error);
              } else {
                resolve(message.value);
              }
              break;

            case 'log':
              logger[message.method](...message.args, { label: name });
              break;
          }
        });

        // Handle worker thread errors
        worker.on('error', err => {
          this.changeActiveThreadCount(-1);
          this.processQueue(threads);
          reject(err);
        });
      };

      // If the active thread count exceeds the limit, add the task to the queue
      if (this.getActiveThreadCount() >= threads) {
        this.queue.push(run);
      } else {
        run();
      }
    });
  }

  /**
   * Process the worker thread queue to start the next available task
   * when there is room for more threads.
   * @param {number} threads - Maximum number of threads to run concurrently
   * @private
   */
  processQueue(threads) {
    if (this.queue.length > 0 && this.getActiveThreadCount() < threads) {
      const next = this.queue.shift();
      if (next) next();
    }
  }
}
