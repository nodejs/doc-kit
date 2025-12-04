'use strict';

import { allGenerators } from '../generators/index.mjs';

/**
 * Creates a ParallelWorker that uses real Node.js Worker threads
 * for parallel processing of items.
 *
 * @param {string} generatorName - Name of the generator (for chunk processing)
 * @param {import('./index.mjs').default} pool - WorkerPool instance for spawning workers
 * @param {object} options - Generator options
 * @returns {ParallelWorker}
 */
export default function createParallelWorker(generatorName, pool, options) {
  const { threads, chunkSize } = options;

  const generator = allGenerators[generatorName];

  /**
   * Splits items into chunks of specified size.
   * @param {number} count - Number of items
   * @param {number} size - Items per chunk
   * @returns {number[][]} Array of index arrays
   */
  const createIndexChunks = (count, size) => {
    const chunks = [];

    for (let i = 0; i < count; i += size) {
      const end = Math.min(i + size, count);

      const chunk = [];

      for (let j = i; j < end; j++) {
        chunk.push(j);
      }

      chunks.push(chunk);
    }

    return chunks;
  };

  /**
   * Strips non-serializable properties from options for worker transfer
   * @param {object} extra - Extra options to merge
   */
  const serializeOptions = extra => {
    const serialized = { ...options, ...extra };

    delete serialized.worker;

    return serialized;
  };

  return {
    /**
     * Process items in parallel using real worker threads.
     * Items are split into chunks, each chunk processed by a separate worker.
     *
     * @template T, R
     * @param {T[]} items - Items to process (must be serializable)
     * @param {T[]} fullInput - Full input data for context rebuilding in workers
     * @param {object} extra - Generator-specific context (e.g. apiTemplate, parsedSideNav)
     * @returns {Promise<R[]>} - Results in same order as input items
     */
    async map(items, fullInput, extra) {
      const itemCount = items.length;

      if (itemCount === 0) {
        return [];
      }

      if (!generator.processChunk) {
        throw new Error(
          `Generator "${generatorName}" does not support chunk processing`
        );
      }

      // For single thread or small workloads - run in main thread
      if (threads <= 1 || itemCount <= 2) {
        const indices = [];

        for (let i = 0; i < itemCount; i++) {
          indices.push(i);
        }

        return generator.processChunk(fullInput, indices, {
          ...options,
          ...extra,
        });
      }

      // Divide items into chunks based on chunkSize
      const indexChunks = createIndexChunks(itemCount, chunkSize);

      // Process chunks in parallel using worker threads
      const chunkResults = await pool.runAll(
        indexChunks.map(indices => ({
          generatorName,
          fullInput,
          itemIndices: indices,
          options: serializeOptions(extra),
        }))
      );

      // Flatten results
      return chunkResults.flat();
    },

    /**
     * Process items in parallel, ignoring return values.
     * @template T
     * @param {T[]} items - Items to process
     * @param {T[]} fullInput - Full input data for context rebuilding
     * @param {object} extra - Generator-specific context
     * @returns {Promise<void>}
     */
    async forEach(items, fullInput, extra) {
      await this.map(items, fullInput, extra);
    },
  };
}
