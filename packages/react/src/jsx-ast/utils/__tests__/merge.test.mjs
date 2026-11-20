import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { merge } from '../merge.mjs';

describe('merge', () => {
  it('yields each item as soon as it arrives, until every source ends', async () => {
    const gate = Promise.withResolvers();

    async function* slow() {
      await gate.promise;

      yield 'slow';
    }

    async function* fast() {
      yield 'fast';
      yield 'faster';
    }

    const items = [];

    for await (const item of merge(slow(), fast())) {
      items.push(item);

      if (item === 'faster') {
        gate.resolve();
      }
    }

    assert.deepEqual(items, ['fast', 'faster', 'slow']);
  });

  it('throws a failure without waiting for the other sources', async () => {
    async function* never() {
      await new Promise(() => {});

      yield 'never';
    }

    async function* failing() {
      yield 'before';

      throw new Error('merged failure');
    }

    const items = [];

    await assert.rejects(async () => {
      for await (const item of merge(never(), failing())) {
        items.push(item);
      }
    }, /merged failure/);

    assert.deepEqual(items, ['before']);
  });
});
