'use strict';

/**
 * Creates a queue that can be read as an async iterable while it is filled.
 *
 * @template T
 */
export const createChannel = () => {
  /** @type {Array<T>} */
  const items = [];

  let added = Promise.withResolvers();
  let ended = false;

  /**
   * Wakes the reader.
   */
  const notify = () => {
    added.resolve();
    added = Promise.withResolvers();
  };

  return {
    /**
     * Adds an item after those not read yet.
     *
     * @param {T} item
     */
    push(item) {
      items.push(item);
      notify();
    },

    /**
     * Drops the items not read yet.
     */
    clear() {
      items.length = 0;
    },

    /**
     * Ends the reading once every item is read.
     */
    end() {
      ended = true;
      notify();
    },

    /**
     * Reads the items as they are added, until the channel ends.
     *
     * @returns {AsyncGenerator<T>}
     */
    async *[Symbol.asyncIterator]() {
      for (;;) {
        while (items.length === 0) {
          if (ended) {
            return;
          }

          await added.promise;
        }

        yield items.shift();
      }
    },
  };
};
