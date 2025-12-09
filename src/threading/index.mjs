import Piscina from 'piscina';

import logger from '../logger/index.mjs';

const poolLogger = logger.child('WorkerPool');

const workerScript = new URL('./chunk-worker.mjs', import.meta.url).href;

/**
 * Creates a Piscina worker pool for parallel processing.
 *
 * @param {number} threads - Maximum number of worker threads
 * @returns {import('piscina').Piscina} Configured Piscina instance
 */
export default function createWorkerPool(threads) {
  poolLogger.debug(`WorkerPool initialized`, {
    threads,
    workerScript: './chunk-worker.mjs',
  });

  return new Piscina({
    filename: workerScript,
    minThreads: threads,
    maxThreads: threads,
    maxQueue: threads * 2,
    idleTimeout: Infinity, // Keep workers alive
  });
}
