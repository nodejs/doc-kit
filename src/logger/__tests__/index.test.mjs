import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

const createLogger = mock.fn(transport => ({ transport }));

mock.module('../logger.mjs', {
  namedExports: { createLogger },
});

const transports = {
  console: { name: 'console-transport' },
  file: { name: 'file-transport' },
};

mock.module('../transports/index.mjs', {
  namedExports: { transports },
});

describe('logger/index', () => {
  it('creates a logger with requested transport', async () => {
    const mod = await import('../index.mjs');

    const instance = mod.Logger('file');

    assert.equal(createLogger.mock.callCount(), 2);
    assert.deepEqual(instance, { transport: transports.file });

    // Default export should use console transport
    assert.deepEqual(mod.default, { transport: transports.console });
  });

  it('throws on unknown transport', async () => {
    const { Logger } = await import('../index.mjs');
    assert.throws(() => Logger('missing'), /Transport 'missing' not found/);
  });
});
