'use strict';

import { allGenerators } from '../generators/index.mjs';
import logger from '../logger/index.mjs';

const parallelLogger = logger.child('parallel');

/**
 * Splits items into chunks of specified size.
 *
 * @param {number} count - Total number of items
 * @param {number} size - Maximum items per chunk
 * @returns {number[][]} Array of index arrays for each chunk
 */
const createChunks = (count, size) => {
  const chunks = [];

  for (let i = 0; i < count; i += size) {
    chunks.push(
      Array.from({ length: Math.min(size, count - i) }, (_, j) => i + j)
    );
  }

  return chunks;
};

/**
 * Prepares task data for a chunk, slicing input to only include relevant items.
 *
 * @param {unknown[]} fullInput - Full input array
 * @param {number[]} indices - Indices to process
 * @param {Object} extra - Stuff to pass to the worker
 * @param {import('../utils/configuration/types').Configuration} configuration - Serialized options
 * @param {string} generatorName - Name of the generator
 * @returns {ParallelTaskOptions} Task data for Piscina
 */
const createTask = (
  fullInput,
  indices,
  extra,
  configuration,
  generatorName
) => {
  return {
    generatorName,
    // Only send the items needed for this chunk (reduces serialization overhead)
    input: indices.map(i => fullInput[i]),
    // Remap indices to 0-based for the sliced array
    itemIndices: indices.map((_, i) => i),
    extra,
    // Only pass the needed configuration to this generator
    configuration: {
      [generatorName]: configuration[generatorName],
    },
  };
};

/**
 * Creates a parallel worker that distributes work across a Piscina thread pool.
 *
 * @param {keyof AllGenerators} generatorName - Generator name
 * @param {import('piscina').Piscina} pool - Piscina instance
 * @param {import('../utils/configuration/types').Configuration} configuration - Generator options
 * @returns {ParallelWorker}
 */
export default async function createParallelWorker(
  generatorName,
  pool,
  configuration
) {
  const { threads, chunkSize } = configuration;

  const generator = await allGenerators[generatorName]();

  return {
    /**
     * Processes items in parallel, yielding results as chunks complete.
     *
     * @template T, R
     * @param {T[]} items - Items to process
     * @param {T[]} fullInput - Full input for context
     * @param {object} extra - Extra options
     * @yields {R[]} Chunk results as they complete
     */
    async *stream(items, fullInput, extra) {
      if (items.length === 0) {
        return;
      }

      const chunks = createChunks(items.length, chunkSize);

      parallelLogger.debug(
        `Distributing ${items.length} items across ${chunks.length} chunks`,
        { generator: generatorName, chunks: chunks.length, chunkSize, threads }
      );

      const runInOneGo = threads <= 1 || items.length <= 2;

      // Submit all tasks to Piscina - each promise resolves to itself for removal
      const pending = new Set(
        chunks.map(indices => {
          if (runInOneGo) {
            const promise = generator
              .processChunk(fullInput, indices, extra)
              .then(result => ({ promise, result }));

            return promise;
          }

          const promise = pool
            .run(
              createTask(
                fullInput,
                indices,
                extra,
                configuration,
                generatorName
              )
            )
            .then(result => ({ promise, result }));

          return promise;
        })
      );

      // Yield results as they complete (true parallel collection)
      let completed = 0;

      while (pending.size > 0) {
        const { promise, result } = await Promise.race(pending);

        pending.delete(promise);

        completed++;

        parallelLogger.debug(`Chunk ${completed}/${chunks.length} completed`, {
          generator: generatorName,
        });

        yield result;
      }
    },
  };
}
