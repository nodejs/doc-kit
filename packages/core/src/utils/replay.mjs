'use strict';

/**
 * Reads the chunks linked from `node`, then throws if the generator failed.
 * A chunk is held only by the link before it, so one every reader has passed
 * is let go.
 *
 * @template T
 * @param {Promise<{ chunk: T[], next: Promise<any> } | undefined> | undefined} node
 * @returns {AsyncGenerator<T[]>}
 */
async function* readFrom(node) {
  if (!node) {
    throw new Error('Chunk 0 was let go before this reader read it');
  }

  for (;;) {
    const link = await node;

    if (!link) {
      return;
    }

    node = link.next;

    yield link.chunk;
  }
}

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
  let tail = Promise.withResolvers();
  let head = tail.promise;

  /**
   * Runs the generator to its end, linking each chunk after the last, whether
   * or not its readers keep up.
   */
  const record = async () => {
    try {
      for await (const chunk of generator) {
        const next = Promise.withResolvers();

        tail.resolve({ chunk, next: next.promise });
        tail = next;
      }

      tail.resolve();
    } catch (error) {
      // Readers get it as they read; a replay with none mustn't report it
      tail.promise.catch(() => {});
      tail.reject(error);

      throw error;
    } finally {
      // Let the finished generator, and all it holds, go
      generator = undefined;
    }
  };

  const ended = record();

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
    read: () => readFrom(head),

    /**
     * Says no more readers will start, so chunks every reader has read can go.
     */
    forget: () => {
      head = undefined;
    },
  };
};
