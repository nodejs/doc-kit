import { deepStrictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { createChannel } from '../channel.mjs';

/**
 * Reads every batch of an async iterable.
 *
 * @template T
 * @param {AsyncIterable<T[]>} iterable
 * @returns {Promise<T[][]>}
 */
async function readBatches(iterable) {
  const batches = [];

  for await (const batch of iterable) {
    batches.push(batch);
  }

  return batches;
}

describe('createChannel', () => {
  it('gives the batches as they are added, until it ends', async () => {
    const channel = createChannel();
    const reading = readBatches(channel);

    channel.push([1]);
    await new Promise(resolve => setImmediate(resolve));
    channel.push([2]);
    channel.end();

    const batches = await reading;

    deepStrictEqual(batches, [[1], [2]]);
  });

  it('gives a prepended batch before those not read yet', async () => {
    const channel = createChannel();

    channel.push([1]);
    channel.push([2]);
    channel.prepend([0]);
    channel.end();

    const batches = await readBatches(channel);

    deepStrictEqual(batches, [[0], [1], [2]]);
  });

  it('drops the batches not read yet when cleared', async () => {
    const channel = createChannel();

    channel.push([1]);
    channel.clear();
    channel.push([2]);
    channel.end();

    const batches = await readBatches(channel);

    deepStrictEqual(batches, [[2]]);
  });
});
