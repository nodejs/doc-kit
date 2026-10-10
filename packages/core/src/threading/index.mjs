import Piscina from 'piscina';

import logger from '#logger/index.mjs';

const poolLogger = logger.child('WorkerPool');

const workerScript = import.meta.resolve('./chunk-worker.mjs');

/**
 * Creates a Piscina worker pool for parallel processing.
 *
 * @param {number} threads - Maximum number of worker threads
 * @param {number} heapSize - Each worker's heap size limit (old space), in MB
 * @returns {import('piscina').Piscina} Configured Piscina instance
 */
export default function createWorkerPool(threads, heapSize) {
  poolLogger.debug(`WorkerPool initialized`, {
    threads,
    heapSize,
    workerScript,
  });

  return new Piscina({
    filename: workerScript,
    minThreads: 0,
    maxThreads: threads,
    idleTimeout: 1_000,
    resourceLimits: { maxOldGenerationSizeMb: heapSize },
    workerData: { logLevel: logger.getLogLevel() },
  });
}
