import Piscina from 'piscina';

import logger from '../logger/index.mjs';

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
    minThreads: threads,
    maxThreads: threads,
    idleTimeout: Infinity, // Keep workers alive
  });
}
