import assert from 'node:assert/strict';
import process from 'node:process';
import { describe, it, mock } from 'node:test';

const logger = {
  error: mock.fn(),
};

mock.module('../../src/logger/index.mjs', {
  defaultExport: logger,
});

const { errorWrap } = await import('../utils.mjs');

describe('bin/utils - errorWrap', () => {
  it('returns wrapped result for sync functions', async () => {
    const wrapped = errorWrap((a, b) => a + b);
    const result = await wrapped(1, 2);
    assert.equal(result, 3);
  });

  it('returns wrapped result for async functions', async () => {
    const wrapped = errorWrap(async a => a * 2);
    const result = await wrapped(4);
    assert.equal(result, 8);
  });

  it('logs and exits when the wrapped function throws', async t => {
    const exit = t.mock.method(process, 'exit');
    exit.mock.mockImplementation(() => {});

    const err = new Error('boom');
    const wrapped = errorWrap(() => {
      throw err;
    });

    await wrapped('x');

    assert.equal(logger.error.mock.callCount(), 1);
    assert.equal(logger.error.mock.calls[0].arguments[0], err);
    assert.equal(exit.mock.callCount(), 1);
    assert.equal(exit.mock.calls[0].arguments[0], 1);
  });
});
