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
    idleTimeout: 1_000,
    resourceLimits: { maxOldGenerationSizeMb: WORKER_HEAP_SIZE },
    workerData: { logLevel: logger.getLogLevel() },
  });
}
