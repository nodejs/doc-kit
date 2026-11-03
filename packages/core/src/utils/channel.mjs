'use strict';

import { createSignal } from './misc.mjs';

/**
 * Creates a queue of batches that can be read as an async iterable while it is
 * still being filled.
 *
 * @template T
 */
export const createChannel = () => {
  /** @type {Array<T[]>} */
  const batches = [];

  // Notified as batches are added, and at the end
  const added = createSignal();

  let ended = false;

  return {
    /**
     * Adds a batch, after those not read yet.
     *
     * @param {T[]} batch
     */
    push(batch) {
      batches.push(batch);
      added.notify();
    },

    /**
     * Adds a batch, before those not read yet.
     *
     * @param {T[]} batch
     */
    prepend(batch) {
      batches.unshift(batch);
      added.notify();
    },

    /**
     * Drops the batches not read yet.
     */
    clear() {
      batches.length = 0;
    },

    /**
     * Ends the channel: the reader stops once it has read every batch.
     */
    end() {
      ended = true;
      added.notify();
    },

    /**
     * Reads the batches as they are added, until the channel ends.
     *
     * @returns {AsyncGenerator<T[]>}
     */
    async *[Symbol.asyncIterator]() {
      for (;;) {
        while (batches.length === 0) {
          if (ended) {
            return;
          }

          await added.wait();
        }

        yield batches.shift();
      }
    },
  };
};
