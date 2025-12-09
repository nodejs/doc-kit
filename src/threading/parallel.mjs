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
 * Prepares task data for a chunk, handling sliceInput optimization.
 *
 * @param {object} generator - Generator with processChunk method
 * @param {unknown[]} fullInput - Full input array
 * @param {number[]} indices - Indices to process
 * @param {object} options - Serialized options
 * @param {string} generatorName - Name of the generator
 * @returns {object} Task data for Piscina
 */
const createTask = (generator, fullInput, indices, options, generatorName) => ({
  generatorName,
  fullInput: generator.processChunk.sliceInput
    ? indices.map(i => fullInput[i])
    : fullInput,
  itemIndices: generator.processChunk.sliceInput
    ? indices.map((_, i) => i)
    : indices,
  options,
});

/**
 * Creates a parallel worker that distributes work across a Piscina thread pool.
 *
 * @param {keyof AllGenerators} generatorName - Generator name
 * @param {import('piscina').Piscina} pool - Piscina instance
 * @param {Partial<GeneratorOptions>} options - Generator options
 * @returns {ParallelWorker}
 */
export default function createParallelWorker(generatorName, pool, options) {
  const { threads, chunkSize } = options;
  const generator = allGenerators[generatorName];

  /** @param {object} extra */
  const serializeOptions = extra => {
    const opts = { ...options, ...extra };

    delete opts.worker;

    return opts;
  };

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

      const opts = serializeOptions(extra);

      parallelLogger.debug(
        `Distributing ${items.length} items across ${chunks.length} chunks`,
        { generator: generatorName, chunks: chunks.length, chunkSize, threads }
      );

      // Submit all tasks to Piscina and wrap with index tracking
      const pending = chunks.map((indices, i) =>
        pool
          .run(createTask(generator, fullInput, indices, opts, generatorName))
          .then(result => ({ i, result }))
      );

      // Yield results as they complete (true parallel collection)
      for (let completed = 0; completed < chunks.length; completed++) {
        const { i, result } = await Promise.race(pending);

        // Replace completed promise with one that never resolves
        pending[i] = new Promise(() => {});

        parallelLogger.debug(
          `Chunk ${completed + 1}/${chunks.length} completed`,
          { generator: generatorName }
        );

        yield result;
      }
    },
  };
}
