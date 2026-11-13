import { deepStrictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { createChannel } from '../channel.mjs';

describe('createChannel', () => {
  it('gives the items as they are added, until it ends', async () => {
    const channel = createChannel();
    const reading = Array.fromAsync(channel);

    channel.push([1]);
    await new Promise(resolve => setImmediate(resolve));
    channel.push([2]);
    channel.end();

    const items = await reading;

    deepStrictEqual(items, [[1], [2]]);
  });

  it('gives a prepended item before those not read yet', async () => {
    const channel = createChannel();

    channel.push([1]);
    channel.push([2]);
    channel.prepend([0]);
    channel.end();

    const items = await Array.fromAsync(channel);

    deepStrictEqual(items, [[0], [1], [2]]);
  });

  it('drops the items not read yet when cleared', async () => {
    const channel = createChannel();

    channel.push([1]);
    channel.clear();
    channel.push([2]);
    channel.end();

    const items = await Array.fromAsync(channel);

    deepStrictEqual(items, [[2]]);
  });
});
