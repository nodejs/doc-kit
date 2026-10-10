import { deepStrictEqual, ok, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { LogLevel } from '../../logger/constants.mjs';
import logger from '../../logger/index.mjs';
import createWorkerPool from '../index.mjs';

const reporterSpecifier = fileURLToPath(
  import.meta.resolve('./fixtures/log-level-reporter.mjs')
);

const pluginsReporterSpecifier = fileURLToPath(
  import.meta.resolve('./fixtures/markdown-plugins-reporter.mjs')
);

const heapLimitReporter = fileURLToPath(
  import.meta.resolve('./fixtures/heap-limit-reporter.mjs')
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

  it('should load the Markdown pipeline of the generator in the worker', async () => {
    const pool = createWorkerPool(1);

    try {
      const [plugins] = await pool.run({
        generatorSpecifier: pluginsReporterSpecifier,
        input: [null],
        itemIndices: [0],
        extra: {},
        configuration: {
          'markdown-plugins-reporter': {
            markdown: {
              rehypePlugins: [
                [
                  import.meta.resolve('./fixtures/rehype-plugin.mjs'),
                  { configured: true },
                ],
              ],
            },
          },
        },
      });

      // The configured plugin is the one its pipeline has, which it configures
      deepStrictEqual(plugins, ['rehypeFixture {"configured":true}']);
    } finally {
      await pool.destroy();
    }
  });

  it("limits each worker's heap to the given size", async () => {
    const pool = createWorkerPool(1, 512);

    try {
      const [workerLimit] = await pool.run({
        generatorSpecifier: heapLimitReporter,
        input: [null],
        itemIndices: [0],
        extra: {},
        configuration: {},
      });

      strictEqual(pool.options.resourceLimits.maxOldGenerationSizeMb, 512);
      // Its old space, plus a young generation of a few dozen MB
      ok(workerLimit < 1024 ** 3);
    } finally {
      await pool.destroy();
    }
  });
});
