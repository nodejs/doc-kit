'use strict';

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
 * @param {string} generatorSpecifier - Resolved specifier of the generator
 * @param {string} generatorName - Name of the generator
 * @returns {ParallelTaskOptions} Task data for Piscina
 */
const createTask = (
  fullInput,
  indices,
  extra,
  configuration,
  generatorSpecifier,
  generatorName
) => {
  return {
    generatorSpecifier,
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
 * @param {string} specifier - Resolved generator specifier (importable from workers)
 * @param {GeneratorMetadata} generator - The loaded generator
 * @param {import('piscina').Piscina} pool - Piscina instance
 * @param {import('../utils/configuration/types').Configuration} configuration - Generator options
 * @returns {ParallelWorker}
 */
export default function createParallelWorker(
  specifier,
  generator,
  pool,
  configuration
) {
  const { threads, chunkSize } = configuration;

  const { name } = generator;

  return {
    /**
     * Processes items in parallel, yielding results as chunks complete.
     *
     * @template T
     * @param {T[]} items - Items to process
     * @param {object} extra - Extra options
     * @yields {R[]} Chunk results as they complete
     */
    async *stream(items, extra) {
      if (items.length === 0) {
        return;
      }

      const chunks = createChunks(items.length, chunkSize);

      parallelLogger.debug(
        `Distributing ${items.length} items across ${chunks.length} chunks`,
        { generator: name, chunks: chunks.length, chunkSize, threads }
      );

      const runInOneGo = threads <= 1 || items.length <= 2;

      // In-process chunks get the same isolation the Piscina transfer gives
      // worker chunks: sliced, remapped, and structured-cloned. Without the
      // clone, generators sharing one process observe each other's (and their
      // own cross-chunk) mutations of shared input — e.g. jsx-ast rewriting
      // entry trees into JSX nodes that legacy-html then cannot compile.
      const slices = runInOneGo
        ? chunks.map(indices => structuredClone(indices.map(i => items[i])))
        : null;

      // Submit all tasks up front so every chunk is in flight at once
      const tasks = chunks.map((indices, chunk) =>
        runInOneGo
          ? generator.processChunk(
              slices[chunk],
              indices.map((_, i) => i),
              structuredClone(extra)
            )
          : pool.run(
              createTask(items, indices, extra, configuration, specifier, name)
            )
      );

      // A chunk may reject while an earlier one is still being awaited; the
      // rejection is re-observed at its `await` below.
      tasks.forEach(task => task.catch(() => {}));

      // Yield in submission order so collected results are deterministic
      // run to run. Parallelism is unaffected (all tasks already run above),
      // and consumers collect the full stream anyway, so completed-but-unyielded
      // chunks cost no memory the collector wasn't about to hold.
      let completed = 0;

      for (const task of tasks) {
        const result = await task;

        completed++;

        parallelLogger.debug(`Chunk ${completed}/${chunks.length} completed`, {
          generator: name,
        });

        yield result;
      }
    },
  };
}
