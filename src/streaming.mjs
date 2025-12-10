'use strict';

import logger from './logger/index.mjs';

const streamingLogger = logger.child('streaming');

/**
 * Checks if a value is an async generator/iterable.
 *
 * @param {unknown} obj - Value to check
 * @returns {obj is AsyncGenerator} True if the value is an async iterable
 */
export const isAsyncGenerator = obj =>
  obj !== null &&
  typeof obj === 'object' &&
  typeof obj[Symbol.asyncIterator] === 'function';

/**
 * Collects all values from an async generator into a flat array.
 * Each yielded chunk is spread into the results array.
 *
 * @template T
 * @param {AsyncGenerator<T[]>} generator - Async generator yielding arrays
 * @returns {Promise<T[]>} Flattened array of all yielded items
 */
export const collectAsyncGenerator = async generator => {
  const results = [];

  let chunkCount = 0;

  for await (const chunk of generator) {
    chunkCount++;

    results.push(...chunk);

    streamingLogger.debug(`Collected chunk ${chunkCount}`, {
      itemsInChunk: chunk.length,
    });
  }

  streamingLogger.debug(`Collection complete`, {
    totalItems: results.length,
    chunks: chunkCount,
  });

  return results;
};

/**
 * Creates a cache for async generator collection results.
 * Ensures that when multiple consumers request the same async generator,
 * only one collection happens and all consumers share the result.
 */
export const createStreamingCache = () => {
  /** @type {Map<string, Promise<unknown[]>>} */
  const cache = new Map();

  return {
    /**
     * Gets the collected result for a generator, starting collection if needed.
     *
     * @param {string} key - Cache key (usually generator name)
     * @param {AsyncGenerator<unknown[]>} generator - The async generator to collect
     * @returns {Promise<unknown[]>} Promise resolving to collected results
     */
    getOrCollect(key, generator) {
      const hasKey = cache.has(key);

      if (!hasKey) {
        cache.set(key, collectAsyncGenerator(generator));
      }

      streamingLogger.debug(
        hasKey
          ? `Using cached result for "${key}"`
          : `Starting collection for "${key}"`
      );

      return cache.get(key);
    },
  };
};
