'use strict';

import assert from 'node:assert/strict';
import { describe, it, mock, beforeEach, afterEach } from 'node:test';

const singleBarInstances = [];

mock.module('cli-progress', {
  defaultExport: {
    Presets: { shades_classic: {} },
    SingleBar: mock.fn(function SingleBar(options) {
      const instance = {
        options,
        start: mock.fn(),
        increment: mock.fn(),
        stop: mock.fn(),
      };

      singleBarInstances.push(instance);

      return instance;
    }),
  },
});

const createProgressBar = (await import('../progress-bar.mjs')).default;

describe('createProgressBar', () => {
  let originalIsTTY;

  beforeEach(() => {
    originalIsTTY = process.stdout.isTTY;
    singleBarInstances.length = 0;
  });

  afterEach(() => {
    process.stdout.isTTY = originalIsTTY;
  });

  it('does not construct a bar and no-ops when stdout is not a TTY', () => {
    process.stdout.isTTY = false;

    const progressBar = createProgressBar();

    assert.doesNotThrow(() => {
      progressBar.start(3);
      progressBar.increment('ast');
      progressBar.stop();
    });

    assert.strictEqual(singleBarInstances.length, 0);
  });

  it('drives a real SingleBar instance when stdout is a TTY', () => {
    process.stdout.isTTY = true;

    const progressBar = createProgressBar();

    assert.strictEqual(singleBarInstances.length, 1);

    const [bar] = singleBarInstances;

    progressBar.start(3);
    assert.strictEqual(bar.start.mock.callCount(), 1);
    assert.deepStrictEqual(bar.start.mock.calls[0].arguments, [
      3,
      0,
      { generator: 'N/A' },
    ]);

    progressBar.increment('ast');
    assert.strictEqual(bar.increment.mock.callCount(), 1);
    assert.deepStrictEqual(bar.increment.mock.calls[0].arguments, [
      { generator: 'ast' },
    ]);

    progressBar.stop();
    assert.strictEqual(bar.stop.mock.callCount(), 1);
  });
});
