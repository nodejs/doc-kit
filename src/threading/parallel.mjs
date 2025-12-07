'use strict';

import { allGenerators } from '../generators/index.mjs';
import {
  createIndexChunks,
  createIndices,
  yieldAsCompleted,
} from '../streaming.mjs';

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
     * Waits for all chunks to complete before returning.
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
        const indices = createIndices(itemCount);

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
     * Process items in parallel and yield each chunk's results as they complete.
     * This enables pipeline parallelism: downstream generators can start processing
     * chunk results while upstream chunks are still being processed.
     *
     * Use this when the consuming generator also supports chunking, allowing it
     * to begin work immediately on each completed chunk rather than waiting
     * for all chunks to finish.
     *
     * @template T, R
     * @param {T[]} items - Items to process (must be serializable)
     * @param {T[]} fullInput - Full input data for context rebuilding in workers
     * @param {object} extra - Generator-specific context
     * @yields {R[]} - Each chunk's results as they complete
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

      // For single thread or small workloads - yield single result
      if (threads <= 1 || itemCount <= 2) {
        const indices = createIndices(itemCount);

        const result = await generator.processChunk(fullInput, indices, {
          ...options,
          ...extra,
        });

        yield result;

        return;
      }

      // Divide items into chunks based on chunkSize
      const indexChunks = createIndexChunks(itemCount, chunkSize);

      // Create all chunk promises upfront for parallel execution
      const chunkPromises = indexChunks.map(indices =>
        pool.run({
          generatorName,
          fullInput,
          itemIndices: indices,
          options: serializeOptions(extra),
        })
      );

      // Yield chunks as they complete
      yield* yieldAsCompleted(chunkPromises);
    },
  };
}
