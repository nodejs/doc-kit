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
    // A worker idle for half a second ends, so its heap is gone during a long
    // stretch of work on the main thread, such as bundling the site, while the
    // short gaps between generators leave it running
    idleTimeout: 500,
    resourceLimits: { maxOldGenerationSizeMb: heapSize },
    workerData: { logLevel: logger.getLogLevel() },
  });
}
