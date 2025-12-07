'use strict';

/**
 * Streaming utilities for processing chunks asynchronously.
 * Provides a unified interface for both parallel (worker threads) and
 * single-threaded processing modes.
 */

/**
 * Helper to check if a value is an async generator/iterable
 * @param {any} obj
 * @returns {boolean}
 */
export const isAsyncGenerator = obj =>
  obj && typeof obj[Symbol.asyncIterator] === 'function';

/**
 * Collects all values from an async generator into a flat array.
 * Each yielded chunk is spread into the results array.
 * @template T
 * @param {AsyncGenerator<T[]>} generator - Async generator yielding arrays
 * @returns {Promise<T[]>} - Flattened array of all yielded items
 */
export const collectAsyncGenerator = async generator => {
  const results = [];

  for await (const chunk of generator) {
    results.push(...chunk);
  }

  return results;
};

/**
 * Splits a count of items into chunks of specified size.
 * Returns arrays of indices for each chunk.
 * @param {number} count - Total number of items
 * @param {number} size - Maximum items per chunk
 * @returns {number[][]} Array of index arrays
 */
export const createIndexChunks = (count, size) => {
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
 * Creates an array of indices from 0 to count-1
 * @param {number} count - Number of indices to create
 * @returns {number[]} Array of indices
 */
export const createIndices = count => {
  const indices = [];

  for (let i = 0; i < count; i++) {
    indices.push(i);
  }

  return indices;
};

/**
 * Yields results from an array of promises as they complete.
 * Uses Promise.race pattern to yield in completion order, not input order.
 * @template T
 * @param {Promise<T>[]} promises - Array of promises to race
 * @yields {T} - Results as they complete
 */
export async function* yieldAsCompleted(promises) {
  const pending = new Map(promises.map((p, i) => [i, p]));

  while (pending.size > 0) {
    const entries = [...pending.entries()];

    const racingPromises = entries.map(([idx, promise]) =>
      promise.then(result => ({ idx, result }))
    );

    const { idx, result } = await Promise.race(racingPromises);

    pending.delete(idx);

    yield result;
  }
}

/**
 * Creates a streaming processor that can run in either parallel or single-threaded mode.
 * Provides a unified interface for generators to process chunks.
 *
 * @param {object} config - Configuration object
 * @param {Function} config.processChunk - Function to process a chunk: (fullInput, indices, options) => Promise<results[]>
 * @param {number} config.chunkSize - Number of items per chunk
 * @param {boolean} config.parallel - Whether to use parallel processing
 * @param {Function} [config.runInWorker] - Function to run chunk in worker: (indices, fullInput, options) => Promise<results[]>
 */
export const createStreamingProcessor = ({
  processChunk,
  chunkSize,
  parallel,
  runInWorker,
}) => ({
  /**
   * Process all items and return results as a single array.
   * @template T, R
   * @param {T[]} items - Items to process
   * @param {T[]} fullInput - Full input for context
   * @param {object} extra - Extra options for processChunk
   * @returns {Promise<R[]>}
   */
  async map(items, fullInput, extra) {
    const itemCount = items.length;

    if (itemCount === 0) {
      return [];
    }

    // Single chunk - process directly
    if (!parallel || itemCount <= chunkSize) {
      const indices = createIndices(itemCount);

      return processChunk(fullInput, indices, extra);
    }

    // Multiple chunks - process in parallel
    const indexChunks = createIndexChunks(itemCount, chunkSize);

    const chunkResults = await Promise.all(
      indexChunks.map(indices => runInWorker(indices, fullInput, extra))
    );

    return chunkResults.flat();
  },

  /**
   * Process items and yield results as each chunk completes.
   * @template T, R
   * @param {T[]} items - Items to process
   * @param {T[]} fullInput - Full input for context
   * @param {object} extra - Extra options for processChunk
   * @yields {R[]} - Each chunk's results as they complete
   */
  async *stream(items, fullInput, extra) {
    const itemCount = items.length;

    if (itemCount === 0) {
      return;
    }

    // Single chunk - yield directly
    if (!parallel || itemCount <= chunkSize) {
      const indices = createIndices(itemCount);
      const result = await processChunk(fullInput, indices, extra);

      yield result;

      return;
    }

    // Multiple chunks - yield as they complete
    const indexChunks = createIndexChunks(itemCount, chunkSize);

    const chunkPromises = indexChunks.map(indices =>
      runInWorker(indices, fullInput, extra)
    );

    yield* yieldAsCompleted(chunkPromises);
  },
});

/**
 * Creates a cache system for collecting async generator results.
 * Ensures that when multiple consumers request the same async generator,
 * only one collection happens and all consumers share the result.
 */
export const createStreamingCache = () => {
  /** @type {Map<string, Promise<any[]>>} */
  const cache = new Map();

  return {
    /**
     * Get the collected result for a generator, starting collection if needed.
     * @param {string} key - Cache key (usually generator name)
     * @param {AsyncGenerator} generator - The async generator to collect
     * @returns {Promise<any[]>} - Promise resolving to collected results
     */
    getOrCollect(key, generator) {
      if (!cache.has(key)) {
        cache.set(key, collectAsyncGenerator(generator));
      }

      return cache.get(key);
    },

    /**
     * Check if a key exists in the cache
     * @param {string} key
     * @returns {boolean}
     */
    has(key) {
      return cache.has(key);
    },

    /**
     * Clear the cache
     */
    clear() {
      cache.clear();
    },
  };
};
