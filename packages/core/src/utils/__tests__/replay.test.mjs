import { deepStrictEqual, rejects } from 'node:assert';
import { describe, it } from 'node:test';

import { createReplay } from '../replay.mjs';

/**
 * Reads every chunk of an async iterable.
 *
 * @template T
 * @param {AsyncIterable<T[]>} iterable
 * @returns {Promise<T[][]>}
 */
async function collectChunks(iterable) {
  const chunks = [];

  for await (const chunk of iterable) {
    chunks.push(chunk);
  }

  return chunks;
}

describe('createReplay', () => {
  it('should give every reader every chunk, in order', async () => {
    const gate = Promise.withResolvers();

    async function* gen() {
      yield [1];
      await gate.promise;
      yield [2];
      yield [3];
    }

    const replay = createReplay(gen());

    const early = collectChunks(replay.read());

    await new Promise(resolve => setImmediate(resolve));
    gate.resolve();

    const late = collectChunks(replay.read());

    const earlyChunks = await early;
    const lateChunks = await late;

    deepStrictEqual(earlyChunks, [[1], [2], [3]]);
    deepStrictEqual(lateChunks, [[1], [2], [3]]);
  });

  it('should throw rather than give a reader a chunk that was let go', async () => {
    async function* gen() {
      yield [1];
      yield [2];
    }

    const replay = createReplay(gen());

    await replay.ended;

    // With no reader left, every chunk goes
    replay.forget();

    await rejects(collectChunks(replay.read()), /Chunk 0 was let go/);
  });

  it('should run the generator to its end, and throw its failure to readers', async () => {
    async function* gen() {
      yield [1];

      throw new Error('replayed failure');
    }

    const replay = createReplay(gen());
    const chunks = [];

    await rejects(replay.ended, /replayed failure/);

    await rejects(async () => {
      for await (const chunk of replay.read()) {
        chunks.push(chunk);
      }
    }, /replayed failure/);

    deepStrictEqual(chunks, [[1]]);
  });
});
