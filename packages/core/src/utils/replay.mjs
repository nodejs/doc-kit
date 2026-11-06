'use strict';

import { createSignal } from './misc.mjs';

/**
 * Runs an async generator to its end, recording its chunks so that any number
 * of readers can each read all of them, from the first, while it still runs.
 *
 * Once no more readers can start (see `forget`), a chunk every reader has read
 * is let go.
 *
 * @template T
 * @param {AsyncGenerator<T[]>} generator - Generator to run
 * @returns {{ ended: Promise<void>, read: () => AsyncGenerator<T[]>, forget: () => void }}
 */
export const createReplay = generator => {
  /** @type {Array<T[] | undefined>} */
  const chunks = [];

  // Where each reader is, by the index of the next chunk it reads
  const readers = new Set();

  let done = false;
  let failure;
  let forgotten = false;
  let trimmed = 0;

  // Notified as each chunk is recorded, and at the end
  const recorded = createSignal();

  /**
   * Lets go of the chunks every reader has read, once no more can start.
   */
  const trim = () => {
    if (!forgotten) {
      return;
    }

    let read = chunks.length;

    for (const reader of readers) {
      read = Math.min(read, reader.index);
    }

    for (; trimmed < read; trimmed++) {
      chunks[trimmed] = undefined;
    }
  };

  /**
   * Runs the generator to its end, recording each chunk, whether or not its
   * readers keep up.
   */
  const record = async () => {
    try {
      for await (const chunk of generator) {
        chunks.push(chunk);
        recorded.notify();
        trim();
      }
    } catch (error) {
      failure = { error };

      throw error;
    } finally {
      done = true;
      recorded.notify();

      // Readers share this closure: let the finished generator, and all it
      // holds, go
      generator = undefined;
    }
  };

  /**
   * Reads every chunk from where a reader is, those recorded and those still
   * to come, then throws if the generator failed.
   *
   * @param {{ index: number }} reader
   * @returns {AsyncGenerator<T[]>}
   */
  async function* readFrom(reader) {
    try {
      for (; ; reader.index++) {
        while (reader.index >= chunks.length) {
          if (failure) {
            throw failure.error;
          }

          if (done) {
            return;
          }

          await recorded.wait();
        }

        // A reader started after `forget` can be behind what was let go: fail
        // rather than give it `undefined` for a chunk
        if (reader.index < trimmed) {
          throw new Error(
            `Chunk ${reader.index} was let go before this reader read it`
          );
        }

        const chunk = chunks[reader.index];

        trim();

        yield chunk;
      }
    } finally {
      readers.delete(reader);
      trim();
    }
  }

  const ended = record();

  // Its readers get a failure as they read; this keeps one with none from
  // being reported as unhandled
  ended.catch(() => {});

  return {
    /**
     * Resolves once the generator has ended, or rejects with its failure.
     */
    ended,

    /**
     * Reads every chunk, from the first. The reader counts from when this is
     * called, not from when it is first read, so nothing it hasn't read yet
     * goes in the meantime.
     *
     * @returns {AsyncGenerator<T[]>}
     */
    read() {
      const reader = { index: 0 };

      readers.add(reader);

      return readFrom(reader);
    },

    /**
     * Says no more readers will start, so chunks every reader has read can go.
     */
    forget() {
      forgotten = true;
      trim();
    },
  };
};
