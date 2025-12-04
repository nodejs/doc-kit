'use strict';

/**
 * Calculates optimal chunk distribution for parallel processing.
 * Balances work evenly across workers while respecting max chunk size.
 *
 * @param {number} itemCount - Total number of items
 * @param {number} threads - Number of available worker threads
 * @param {number} maxChunkSize - Maximum items per chunk
 * @returns {{ chunkSize: number, numChunks: number }}
 */
function calculateChunkStrategy(itemCount, threads, maxChunkSize) {
  // Determine how many chunks we want (ideally one per thread, but not more than items)
  const targetChunks = Math.min(threads, itemCount);

  // Calculate base chunk size to distribute work evenly
  const baseChunkSize = Math.ceil(itemCount / targetChunks);

  // Respect the max chunk size limit
  const chunkSize = Math.min(baseChunkSize, maxChunkSize);

  // Calculate actual number of chunks needed
  const numChunks = Math.ceil(itemCount / chunkSize);

  return { chunkSize, numChunks };
}

/**
 * Splits indices into chunks of specified size.
 * @param {number} count - Number of items
 * @param {number} chunkSize - Items per chunk
 * @returns {number[][]} Array of index arrays
 */
function createIndexChunks(count, chunkSize) {
  const chunks = [];

  for (let i = 0; i < count; i += chunkSize) {
    const end = Math.min(i + chunkSize, count);
    chunks.push(Array.from({ length: end - i }, (_, j) => i + j));
  }

  return chunks;
}

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
  const { threads = 1, chunkSize: maxChunkSize = 20 } = options;

  // Cache for lazy-loaded generator reference
  let cachedGenerator;

  /**
   * Gets the generator (lazy-loaded and cached)
   */
  const getGenerator = async () => {
    if (!cachedGenerator) {
      const { allGenerators } = await import('../generators/index.mjs');

      cachedGenerator = allGenerators[generatorName];
    }
    return cachedGenerator;
  };

  /**
   * Strips non-serializable properties from options for worker transfer
   * @param {object} opts - Options to serialize
   */
  const serializeOptions = opts => {
    const serialized = { ...options, ...opts };

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
     * @param {object} opts - Additional options to pass to workers
     * @returns {Promise<R[]>} - Results in same order as input items
     */
    async map(items, fullInput, opts = {}) {
      const itemCount = items.length;

      if (itemCount === 0) {
        return [];
      }

      const generator = await getGenerator();

      if (!generator.processChunk) {
        throw new Error(
          `Generator "${generatorName}" does not support chunk processing`
        );
      }

      // For single thread, single item, or very small workloads - run in main thread
      // Worker overhead isn't worth it for small tasks
      const shouldUseMainThread = threads <= 1 || itemCount <= 2;

      if (shouldUseMainThread) {
        const indices = Array.from({ length: itemCount }, (_, i) => i);

        return generator.processChunk(fullInput, indices, {
          ...options,
          ...opts,
        });
      }

      // Calculate optimal chunk distribution
      const { chunkSize } = calculateChunkStrategy(
        itemCount,
        threads,
        maxChunkSize
      );

      // Create index chunks for parallel processing
      const indexChunks = createIndexChunks(itemCount, chunkSize);

      // Process chunks in parallel using worker threads
      const chunkResults = await pool.runAll(
        indexChunks.map(indices => ({
          generatorName,
          fullInput,
          itemIndices: indices,
          options: serializeOptions(opts),
        }))
      );

      // Flatten results (each worker returns array of results for its chunk)
      return chunkResults.flat();
    },

    /**
     * Process items in parallel, ignoring return values.
     * @template T
     * @param {T[]} items - Items to process
     * @param {T[]} fullInput - Full input data for context rebuilding
     * @param {object} opts - Additional options
     * @returns {Promise<void>}
     */
    async forEach(items, fullInput, opts = {}) {
      await this.map(items, fullInput, opts);
    },
  };
}
