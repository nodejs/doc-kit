import Piscina from 'piscina';

import logger from '#logger/index.mjs';

import { WORKER_HEAP_SIZE } from './constants.mjs';

const poolLogger = logger.child('WorkerPool');

const workerScript = import.meta.resolve('./chunk-worker.mjs');

/**
 * Creates a Piscina worker pool for parallel processing.
 *
 * @param {number} threads - Maximum number of worker threads
 * @returns {import('piscina').Piscina} Configured Piscina instance
 */
export default function createWorkerPool(threads) {
  poolLogger.debug(`WorkerPool initialized`, {
    threads,
    workerScript,
  });

  return new Piscina({
    filename: workerScript,
    minThreads: 0,
    maxThreads: threads,
    // A worker idle for 250ms ends, so its heap is gone during a long stretch
    // of work on the main thread, such as bundling the site
    idleTimeout: 250,
    resourceLimits: { maxOldGenerationSizeMb: WORKER_HEAP_SIZE },
    recordTiming: false,
    workerData: { logLevel: logger.getLogLevel() },
  });
}
