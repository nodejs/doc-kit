import { deepStrictEqual, rejects } from 'node:assert';
import { describe, it } from 'node:test';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';

import { createTee } from '../tee.mjs';

setFlagsFromString('--expose-gc');

const gc = runInNewContext('gc');

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

/**
 * Collects garbage until `done` holds, at most ten times.
 *
 * @param {() => boolean} done
 * @returns {Promise<void>}
 */
async function collectGarbage(done) {
  for (let i = 0; i < 10 && !done(); i++) {
    await new Promise(resolve => setImmediate(resolve));
    gc();
  }
}

describe('createTee', () => {
  it('should let go of the chunks every reader has read while it still records', async () => {
    const released = new Set();
    const registry = new FinalizationRegistry(value => released.add(value));
    const gate = Promise.withResolvers();

    /**
     * A chunk holding an item that tells when it is let go.
     *
     * @param {number} value
     * @returns {Array<object>}
     */
    const chunkOf = value => {
      const item = {};

      registry.register(item, value);

      return [item];
    };

    async function* gen() {
      for (let value = 0; value < 4; value++) {
        yield chunkOf(value);
      }

      await gate.promise;

      yield chunkOf(4);
    }

    const tee = createTee(gen());
    const readers = [tee.read(), tee.read()];

    tee.forget();

    for (const reader of readers) {
      for (let i = 0; i < 4; i++) {
        await reader.next();
      }
    }

    // The last chunk read may still be held where each reader is suspended
    await collectGarbage(() => [0, 1, 2].every(value => released.has(value)));

    deepStrictEqual(
      [0, 1, 2].filter(value => released.has(value)),
      [0, 1, 2]
    );

    gate.resolve();

    for (const reader of readers) {
      await collectChunks(reader);
    }

    // Once its readers are done, so is the last chunk
    await collectGarbage(() => released.has(4));

    deepStrictEqual(released.size, 5);
  });

  it('should give every reader every chunk, in order', async () => {
    const gate = Promise.withResolvers();

    async function* gen() {
      yield [1];
      await gate.promise;
      yield [2];
      yield [3];
    }

    const tee = createTee(gen());

    const early = collectChunks(tee.read());

    await new Promise(resolve => setImmediate(resolve));
    gate.resolve();

    const late = collectChunks(tee.read());

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

    const tee = createTee(gen());

    await tee.ended;

    // With no reader left, every chunk goes
    tee.forget();

    await rejects(collectChunks(tee.read()), /Chunk 0 was let go/);
  });

  it('should run the generator to its end, and throw its failure to readers', async () => {
    async function* gen() {
      yield [1];

      throw new Error('boom');
    }

    const tee = createTee(gen());
    const chunks = [];

    await rejects(tee.ended, /boom/);

    await rejects(async () => {
      for await (const chunk of tee.read()) {
        chunks.push(chunk);
      }
    }, /boom/);

    deepStrictEqual(chunks, [[1]]);
  });

  it('should not report a failure as unhandled when nothing reads it', async () => {
    const unhandled = [];
    const onUnhandled = error => unhandled.push(error);

    async function* gen() {
      yield [1];

      throw new Error('boom');
    }

    process.on('unhandledRejection', onUnhandled);

    try {
      createTee(gen());

      // A rejection left unhandled is reported once the microtasks have run
      await new Promise(resolve => setImmediate(resolve));
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }

    deepStrictEqual(unhandled, []);
  });
});
