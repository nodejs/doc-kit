import { strictEqual } from 'node:assert';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { LogLevel } from '../../logger/constants.mjs';
import logger from '../../logger/index.mjs';
import createWorkerPool from '../index.mjs';

const reporterSpecifier = fileURLToPath(
  import.meta.resolve('./fixtures/log-level-reporter.mjs')
);

/**
 * Runs a function with the logger temporarily set to the given level.
 *
 * @template T
 * @param {number} level - Log level to apply for the duration of the callback
 * @param {() => Promise<T>} fn - Callback to run
 * @returns {Promise<T>}
 */
const withLogLevel = async (level, fn) => {
  const original = logger.getLogLevel();

  logger.setLogLevel(level);

  try {
    return await fn();
  } finally {
    logger.setLogLevel(original);
  }
};

describe('createWorkerPool', () => {
  it('should forward the current log level to workers', async () => {
    await withLogLevel(LogLevel.fatal, async () => {
      const pool = createWorkerPool(1);

      try {
        strictEqual(pool.options.workerData.logLevel, LogLevel.fatal);
      } finally {
        await pool.destroy();
      }
    });
  });

  it('should apply the forwarded log level inside the worker', async () => {
    await withLogLevel(LogLevel.fatal, async () => {
      const pool = createWorkerPool(1);

      try {
        const [levelInWorker] = await pool.run({
          generatorSpecifier: reporterSpecifier,
          input: [null],
          itemIndices: [0],
          extra: {},
          configuration: {},
        });

        strictEqual(levelInWorker, LogLevel.fatal);
      } finally {
        await pool.destroy();
      }
    });
  });

  it('should leave workers at the default level when it is not changed', async () => {
    const pool = createWorkerPool(1);

    try {
      const [levelInWorker] = await pool.run({
        generatorSpecifier: reporterSpecifier,
        input: [null],
        itemIndices: [0],
        extra: {},
        configuration: {},
      });

      strictEqual(levelInWorker, LogLevel.info);
    } finally {
      await pool.destroy();
    }
  });
});
