'use strict';

import { createChannel } from '@doc-kit/core/utils/channel.mjs';

/**
 * Yields the items of several async iterables as they arrive. A failure is
 * thrown without waiting for the other iterables.
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
   * Passes a source's items on.
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
