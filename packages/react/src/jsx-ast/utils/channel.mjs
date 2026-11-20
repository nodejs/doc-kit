'use strict';

/**
 * Creates a queue of items that can be read as an async iterable while it is
 * still being filled.
 *
 * @template T
 */
export const createChannel = () => {
  /** @type {Array<T>} */
  const items = [];

  // Resolved as items are added, and at the end
  let added = Promise.withResolvers();

  /**
   * Wakes the reader waiting for an item, or for the end.
   */
  const notify = () => {
    added.resolve();
    added = Promise.withResolvers();
  };

  let ended = false;

  return {
    /**
     * Adds an item, after those not read yet.
     *
     * @param {T} item
     */
    push(item) {
      items.push(item);
      notify();
    },

    /**
     * Adds an item, before those not read yet.
     *
     * @param {T} item
     */
    prepend(item) {
      items.unshift(item);
      notify();
    },

    /**
     * Drops the items not read yet.
     */
    clear() {
      items.length = 0;
    },

    /**
     * Ends the channel: the reader stops once it has read every item.
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
