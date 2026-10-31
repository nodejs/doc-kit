'use strict';

import logger from './logger/index.mjs';
import { isAsyncIterable } from './utils/misc.mjs';
import { createReplay } from './utils/replay.mjs';

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
 * Gives a value as the single chunk of an async generator.
 *
 * @template T
 * @param {T} value
 * @returns {AsyncGenerator<T>}
 */
async function* once(value) {
  yield value;
}

/**
 * Creates the cache that backs the generator pipeline. It is the single owner
 * of every piece of caching the orchestrator needs.
 *
 * Generator caching: each generator's pending result, so a generator and its
 * dependencies are only ever scheduled once.
 *
 * Stream caching: running an async generator exactly once, recording its
 * chunks for every consumer: those that collect it share a single array, and
 * those that stream it read each chunk as soon as it is yielded.
 *
 * Dependency caching & eviction: tracking how many consumers still need each
 * result and dropping it once the last one has asked for it, and a streamed
 * result's chunks once every reader has read them, so intermediate results can
 * be garbage collected while later generators keep running.
 */
export const createCache = () => {
  /** @type {{ [key: string]: Promise<unknown> | AsyncGenerator }} */
  const results = {};

  // The replays of the results that stream, and those of them collected into
  // one array, shared by the consumers that collect them
  /** @type {Map<string, ReturnType<typeof createReplay>>} */
  const replays = new Map();
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
   * Gets the replay of a streamed result, starting it the first time a
   * consumer reads the result, so every consumer shares its one run.
   *
   * @param {string} name - Cache key (resolved generator specifier)
   * @param {AsyncGenerator<unknown[]>} generator - The result
   * @returns {ReturnType<typeof createReplay>}
   */
  const replayOf = (name, generator) => {
    if (!replays.has(name)) {
      cachingLogger.debug(`Starting to record "${name}"`);

      replays.set(name, createReplay(generator));
    }

    return replays.get(name);
  };

  /**
   * Counts a read of a result, and evicts it once every expected consumer has
   * read it.
   *
   * @param {string} name - Cache key (resolved generator specifier)
   */
  const release = name => {
    if (name in remaining && --remaining[name] <= 0) {
      delete results[name];

      // Every reader has started, so what they all read can go
      replays.get(name)?.forget();
      replays.delete(name);
      collections.delete(name);

      cachingLogger.debug(`Evicted "${name}" after final consumer`);
    }
  };

  return {
    /**
     * Whether a generator has already been scheduled.
     *
     * @param {string} name - Cache key (resolved generator specifier)
     * @returns {boolean}
     */
    has: name => name in results,

    /**
     * Registers a generator's pending result.
     *
     * @param {string} name - Cache key (resolved generator specifier)
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
     * @param {string[]} targets - Requested generator cache keys
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
     * @param {string} name - Cache key (resolved generator specifier) to consume
     * @returns {Promise<unknown>}
     */
    consume: async name => {
      const result = await results[name];

      let value = result;

      if (isAsyncIterable(result)) {
        // Consumers that collect it share one array, read like a stream
        if (!collections.has(name)) {
          collections.set(
            name,
            collectAsyncGenerator(replayOf(name, result).read())
          );
        }

        value = await collections.get(name);
      }

      release(name);

      return value;
    },

    /**
     * Gives a reader of a generator's result as it is produced: chunk by chunk
     * if it streams, or as a single chunk once it resolves. As with `consume`,
     * the result is awaited and its recording started right away, so the
     * generator runs and its failure is handled before the reader starts
     * reading, and this counts as one of its reads.
     *
     * @param {string} name - Cache key (resolved generator specifier) to stream
     * @returns {Promise<AsyncIterable<unknown[]>>}
     */
    stream: async name => {
      const result = await results[name];

      let reader;

      if (isAsyncIterable(result)) {
        reader = replayOf(name, result).read();
      } else {
        // A result that doesn't stream is read as a single chunk
        reader = once(result);
      }

      release(name);

      let read = false;

      // Read once: what every reader has read is let go
      return {
        /**
         * Reads every chunk, from the first, once.
         *
         * @returns {AsyncGenerator<unknown[]>}
         */
        [Symbol.asyncIterator]: () => {
          if (read) {
            throw new Error(`The output of "${name}" can only be read once`);
          }

          read = true;

          return reader;
        },
      };
    },
  };
};
