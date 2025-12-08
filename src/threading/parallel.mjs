'use strict';

import { allGenerators } from '../generators/index.mjs';
import logger from '../logger/index.mjs';

const parallelLogger = logger.child('parallel');

/**
 * Splits a count of items into chunks of specified size.
 *
 * @param {number} count - Total number of items
 * @param {number} size - Maximum items per chunk
 * @returns {number[][]} Array of index arrays, each representing a chunk
 */
const createIndexChunks = (count, size) => {
  const chunks = [];

  for (let start = 0; start < count; start += size) {
    const end = Math.min(start + size, count);
    const chunk = [];

    for (let i = start; i < end; i++) {
      chunk.push(i);
    }

    chunks.push(chunk);
  }

  return chunks;
};

/**
 * Creates an array of sequential indices from 0 to count-1.
 *
 * @param {number} count - Number of indices to create
 * @returns {number[]} Array of indices [0, 1, 2, ..., count-1]
 */
const createIndices = count => Array.from({ length: count }, (_, i) => i);

/**
 * Yields results from an array of promises as they complete.
 * Results are yielded in completion order, not input order.
 *
 * @template T
 * @param {Promise<T>[]} promises - Array of promises to race
 * @yields {T} Results as they complete
 */
async function* yieldAsCompleted(promises) {
  if (promises.length === 0) {
    return;
  }

  // Wrap each promise to track completion and remove from pending set
  const pending = new Set();

  for (const promise of promises) {
    const tagged = promise.then(result => {
      pending.delete(tagged);

      return result;
    });

    pending.add(tagged);
  }

  // Yield results as each promise completes
  while (pending.size > 0) {
    yield await Promise.race(pending);
  }
}

/**
 * Creates a ParallelWorker that uses Node.js Worker threads for parallel
 * processing of items. The worker distributes work across multiple threads
 * and streams results as chunks complete.
 *
 * @param {string} generatorName - Name of the generator for chunk processing
 * @param {import('./index.mjs').default} pool - WorkerPool instance
 * @param {Partial<GeneratorOptions>} options - Generator options
 * @returns {ParallelWorker}
 */
export default function createParallelWorker(generatorName, pool, options) {
  const { threads, chunkSize } = options;

  const generator = allGenerators[generatorName];

  /**
   * Strips non-serializable properties from options for worker transfer.
   *
   * @param {object} extra - Extra options to merge
   * @returns {object} Serializable options object
   */
  const serializeOptions = extra => {
    const serialized = { ...options, ...extra };

    delete serialized.worker;

    return serialized;
  };

  return {
    /**
     * Processes items in parallel and yields each chunk's results as they complete.
     * Enables pipeline parallelism where downstream generators can start processing
     * results while upstream chunks are still being processed.
     *
     * @template T, R
     * @param {T[]} items - Items to process (determines chunk distribution)
     * @param {T[]} fullInput - Full input data for context rebuilding in workers
     * @param {object} extra - Generator-specific context (e.g., apiTemplate)
     * @yields {R[]} Each chunk's results as they complete
     */
    async *stream(items, fullInput, extra) {
      const itemCount = items.length;

      if (itemCount === 0) {
        return;
      }

      if (!generator.processChunk) {
        throw new Error(
          `Generator "${generatorName}" does not support chunk processing`
        );
      }

      // Single-threaded mode: process directly in main thread
      if (threads <= 1) {
        parallelLogger.debug(`Processing ${itemCount} items in main thread`, {
          generator: generatorName,
        });

        const indices = createIndices(itemCount);

        const result = await generator.processChunk(fullInput, indices, {
          ...options,
          ...extra,
        });

        yield result;

        return;
      }

      // Multi-threaded mode: distribute work across worker threads
      // Calculate optimal chunk size to maximize thread utilization
      // Use provided chunkSize as maximum, but create at least as many chunks as threads
      const optimalChunkSize = Math.max(1, Math.ceil(itemCount / threads));
      const effectiveChunkSize = Math.min(chunkSize, optimalChunkSize);
      const indexChunks = createIndexChunks(itemCount, effectiveChunkSize);

      parallelLogger.debug(
        `Distributing ${itemCount} items across ${threads} threads`,
        {
          generator: generatorName,
          chunks: indexChunks.length,
          chunkSize: effectiveChunkSize,
        }
      );

      const chunkPromises = indexChunks.map(indices => {
        // If generator's processChunk supports sliced input (doesn't need full context),
        // send only the items at the specified indices to reduce serialization overhead
        const inputData = generator.processChunk.sliceInput
          ? indices.map(i => fullInput[i])
          : fullInput;

        return pool.run({
          generatorName,
          fullInput: inputData,
          itemIndices: generator.processChunk.sliceInput
            ? indices.map((_, i) => i) // Renumber indices for sliced array
            : indices,
          options: serializeOptions(extra),
        });
      });

      // Yield results as each chunk completes
      let completedChunks = 0;

      for await (const result of yieldAsCompleted(chunkPromises)) {
        completedChunks++;

        parallelLogger.debug(
          `Chunk ${completedChunks}/${indexChunks.length} completed`,
          { generator: generatorName }
        );

        yield result;
      }
    },
  };
}
