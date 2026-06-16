'use strict';

import logger from './logger/index.mjs';
import { isAsyncIterable } from './utils/misc.mjs';

const cachingLogger = logger.child('caching');

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

    cachingLogger.debug(`Collected chunk ${chunkCount}`, {
      itemsInChunk: chunk.length,
    });
  }

  cachingLogger.debug(`Collection complete`, {
    totalItems: results.length,
    chunks: chunkCount,
  });

  return results;
};

/**
 * Creates the cache that backs the generator pipeline. It is the single owner
 * of every piece of caching the orchestrator needs.
 *
 * Generator caching: each generator's pending result, so a generator and its
 * dependencies are only ever scheduled once.
 *
 * Stream caching: collecting an async generator's chunks into a single array
 * exactly once, shared by every consumer.
 *
 * Dependency caching & eviction: tracking how many consumers still need each
 * result and dropping it once the last one has read it, so intermediate results
 * can be garbage collected while later generators keep running.
 */
export const createCache = () => {
  /** @type {{ [key: string]: Promise<unknown> | AsyncGenerator }} */
  const results = {};

  /** @type {Map<string, Promise<unknown[]>>} */
  const collections = new Map();

  /**
   * Number of consumers that still need to read each result. Once it reaches
   * zero the result is evicted.
   *
   * @type {{ [key: string]: number }}
   */
  const remaining = {};

  /**
   * Collects an async generator's chunks, ensuring a single collection is
   * shared across all consumers of the same key.
   *
   * @param {string} key - Cache key (the generator name)
   * @param {AsyncGenerator<unknown[]>} generator - Generator to collect
   * @returns {Promise<unknown[]>} Promise resolving to the collected items
   */
  const collect = (key, generator) => {
    const hasKey = collections.has(key);

    if (!hasKey) {
      collections.set(key, collectAsyncGenerator(generator));
    }

    cachingLogger.debug(
      hasKey
        ? `Using cached collection for "${key}"`
        : `Starting collection for "${key}"`
    );

    return collections.get(key);
  };

  return {
    /**
     * Whether a generator has already been scheduled.
     *
     * @param {string} name - Generator name
     * @returns {boolean}
     */
    has: name => name in results,

    /**
     * Registers a generator's pending result.
     *
     * @param {string} name - Generator name
     * @param {Promise<unknown> | AsyncGenerator} result - Pending result
     */
    store: (name, result) => {
      results[name] = result;
    },

    /**
     * Computes and records consumer counts across the dependency closure of the
     * requested generators. A generator is consumed once per dependent
     * generator, plus once more when it is a requested target (read by the
     * final collection). This drives eviction without coupling the cache to the
     * generator registry: callers supply how to resolve a dependency.
     *
     * @param {string[]} targets - Requested generator names
     * @param {(name: string) => string | undefined} dependsOn - Resolves a
     * generator's dependency name (if any)
     */
    populateConsumerCounts: (targets, dependsOn) => {
      const scheduled = new Set();
      const stack = [...targets];

      // Walk the dependency closure of the requested targets
      while (stack.length > 0) {
        const name = stack.pop();

        if (scheduled.has(name)) {
          continue;
        }

        scheduled.add(name);

        const dependency = dependsOn(name);

        if (dependency) {
          stack.push(dependency);
        }
      }

      // Each scheduled generator consumes its dependency exactly once
      for (const name of scheduled) {
        const dependency = dependsOn(name);

        if (dependency) {
          remaining[dependency] = (remaining[dependency] ?? 0) + 1;
        }
      }

      // Each requested target is consumed once more by the final collection
      for (const name of targets) {
        remaining[name] = (remaining[name] ?? 0) + 1;
      }
    },

    /**
     * Reads a generator's result (collecting it first if it streams) and
     * evicts it once every expected consumer has read it.
     *
     * @param {string} name - Generator name to consume
     * @returns {Promise<unknown>}
     */
    consume: async name => {
      const result = await results[name];

      const value = isAsyncIterable(result)
        ? await collect(name, result)
        : result;

      // Evict once the last consumer has retrieved the result
      if (name in remaining && --remaining[name] <= 0) {
        delete results[name];
        collections.delete(name);

        cachingLogger.debug(`Evicted "${name}" after final consumer`);
      }

      return value;
    },
  };
};
