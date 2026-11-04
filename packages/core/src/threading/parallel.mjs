'use strict';

import logger from '#logger/index.mjs';
import { isAsyncIterable } from '#utils/misc.mjs';

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
  const { threads: defaultThreads = 1, chunkSize } = configuration;
  const threads = Math.max(Number(defaultThreads), 1);

  const { name } = generator;

  return {
    /**
     * Processes items in parallel, yielding results in submission order.
     *
     * The items can also arrive in batches, as a dependency streams them: a
     * batch's chunks start while earlier ones still run, and the next batch is
     * read once there is room for its chunks.
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

      // The chunks the batches read so far were split into
      let distributed = 0;

      /**
       * Splits a batch into chunks.
       *
       * @param {T[]} batch - Items to split
       * @returns {number[][]} Each chunk's indices into the batch
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
            const result = await generator.processChunk(batch, indices, extra);

            yield result;
          }
        }

        return;
      }

      // Start only a few chunks per thread at a time, reading the next batch
      // once there is room, so that generators running at once share the pool
      // instead of one's chunks waiting behind all of another's. Emit results in
      // submission order. Handle errors as each task settles so a later failure
      // cannot become an unhandled rejection while earlier chunks are still
      // running.
      const tasks = [];
      const limit = threads * CHUNKS_PER_THREAD;

      let running = 0;
      let doneReading = false;

      // Resolved when a running chunk settles, while the reader waits for room
      let room;

      // Resolved when a chunk starts or the reading ends, while the consumer
      // waits for one
      let added;

      /**
       * Starts a batch's chunks, waiting for room whenever the limit is
       * reached: an array's first chunks start right away.
       *
       * @param {T[]} batch - Items to start
       */
      const enqueue = async batch => {
        for (const indices of distribute(batch)) {
          while (running >= limit) {
            room = Promise.withResolvers();

            await room.promise;
          }

          running++;

          const task = pool.run(
            createTask(batch, indices, extra, configuration, specifier, name)
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
       * Starts every batch's chunks, reading the next batch once there is room
       * for them.
       */
      const readBatches = async () => {
        try {
          if (!streamed) {
            await enqueue(items);

            return;
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

      // A failure reading the batches is thrown below, once every chunk
      // submitted before it has been emitted
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

        // Emitted chunks are the consumer's to keep or let go
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
