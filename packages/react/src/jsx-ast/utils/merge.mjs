'use strict';

import { createChannel } from './channel.mjs';

/**
 * Reads several async iterables at once, yielding each item as soon as it
 * arrives, until they have all ended. A failure is thrown once the items that
 * arrived before it are yielded, without waiting for the other iterables.
 *
 * @template T
 * @param {...AsyncIterable<T>} sources
 * @returns {AsyncGenerator<T>}
 */
export async function* merge(...sources) {
  const channel = createChannel();

  let pending = sources.length;
  let failure;

  /**
   * Passes a source's items on as they arrive, and ends the channel once every
   * source has ended, or one fails.
   *
   * @param {AsyncIterable<T>} source
   */
  const pipe = async source => {
    try {
      for await (const item of source) {
        channel.push(item);
      }
    } catch (error) {
      failure ??= { error };
    } finally {
      pending--;

      if (failure || pending === 0) {
        channel.end();
      }
    }
  };

  for (const source of sources) {
    pipe(source);
  }

  yield* channel;

  if (failure) {
    throw failure.error;
  }
}
