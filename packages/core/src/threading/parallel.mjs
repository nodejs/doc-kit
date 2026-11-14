'use strict';

import logger from '#logger/index.mjs';
import { isAsyncIterable, omitKeys } from '#utils/misc.mjs';

import { CHUNKS_PER_THREAD } from './constants.mjs';

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

  const { name, workerConfigOmit } = generator;

  const workerConfiguration =
    workerConfigOmit?.length && configuration[name]
      ? {
          ...configuration,
          [name]: omitKeys(configuration[name], workerConfigOmit),
        }
      : configuration;

  return {
    /**
     * Processes items in parallel, yielding results in submission order.
     *
     * Items can also arrive as an async iterable of batches: a batch's chunks
     * start while earlier ones still run, and the next batch is read once
     * there is room for its chunks.
     *
     * @template T
     * @param {T[] | AsyncIterable<T[]>} items - Items to process
     * @param {object} extra - Extra options
     * @yields {R[]} Chunk results in input order
     */
    async *stream(items, extra) {
      const streamed = isAsyncIterable(items);

      if (!streamed && items.length === 0) {
        return;
      }

      const batches = streamed ? items : [items];

      // Total chunks across the batches read so far, for logging
      let distributed = 0;

      /**
       * Splits a batch into chunks of indices.
       *
       * @param {T[]} batch
       * @returns {number[][]}
       */
      const distribute = batch => {
        const chunks = createChunks(batch.length, chunkSize);

        distributed += chunks.length;

        parallelLogger.debug(
          `Distributing ${batch.length} items across ${chunks.length} chunks`,
          { generator: name, chunks: chunks.length, chunkSize, threads }
        );

        return chunks;
      };

      // On this thread, one chunk at a time, so their work isn't all held at once
      if (threads <= 1 || (!streamed && items.length <= 2)) {
        for await (const batch of batches) {
          for (const indices of distribute(batch)) {
            yield await generator.processChunk(batch, indices, extra);
          }
        }

        return;
      }

      // Keep only a few chunks per thread in flight so generators running at
      // once share the pool, and emit results in submission order. Errors are
      // captured as each task settles so a later failure can't become an
      // unhandled rejection while earlier chunks are still running.
      const tasks = [];
      const limit = threads * CHUNKS_PER_THREAD;

      let running = 0;
      let doneReading = false;

      // Resolved when a chunk settles (the reader waits on it for room)
      let room;

      // Resolved when a chunk starts or reading ends (the consumer waits on it)
      let added;

      /**
       * Starts a batch's chunks, waiting for room whenever the limit is hit.
       *
       * @param {T[]} batch
       */
      const enqueue = async batch => {
        for (const indices of distribute(batch)) {
          while (running >= limit) {
            room = Promise.withResolvers();

            await room.promise;
          }

          running++;

          const task = pool.run(
            createTask(
              batch,
              indices,
              extra,
              workerConfiguration,
              specifier,
              name
            )
          );

          tasks.push(
            task
              .then(
                result => ({ result }),
                error => ({ error })
              )
              .finally(() => {
                running--;
                room?.resolve();
              })
          );

          added?.resolve();
        }
      };

      /**
       * Reads every batch and starts its chunks.
       */
      const readBatches = async () => {
        try {
          // An array's first chunks start synchronously
          if (!streamed) {
            return await enqueue(items);
          }

          for await (const batch of items) {
            await enqueue(batch);
          }
        } finally {
          doneReading = true;
          added?.resolve();
        }
      };

      const reading = readBatches();

      // A read failure is rethrown below, after every chunk before it is emitted
      reading.catch(() => {});

      for (let index = 0; ; index++) {
        while (index >= tasks.length) {
          if (doneReading) {
            await reading;

            return;
          }

          added = Promise.withResolvers();

          await added.promise;
        }

        const outcome = await tasks[index];

        // Drop our reference so emitted results can be collected
        tasks[index] = undefined;

        if ('error' in outcome) {
          throw outcome.error;
        }

        parallelLogger.debug(`Chunk ${index + 1}/${distributed} completed`, {
          generator: name,
        });

        yield outcome.result;
      }
    },
  };
}
