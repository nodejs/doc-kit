import { matchesGlob, resolve } from 'node:path';
import process from 'node:process';

import { watch } from 'chokidar';
import { Command } from 'commander';
import globParent from 'glob-parent';

import createGenerator, { SKIPPED } from '../../src/generators.mjs';
import logger from '../../src/logger/index.mjs';
import {
  assertRunnableOptions,
  setConfig,
} from '../../src/utils/configuration/index.mjs';
import { errorWrap, insertCommonOptions } from '../utils.mjs';

const watchLogger = logger.child('watch');

const DEBOUNCE_MS = 100;

/**
 * Runs one generation pass.
 *
 * @param {import('../../src/utils/configuration/types').Configuration} config - The configuration
 * @returns {Promise<void>}
 */
const build = async config => {
  const startedAt = Date.now();

  try {
    const { runGenerators } = createGenerator();

    const results = await runGenerators(config);
    const duration = Date.now() - startedAt;

    watchLogger.info(
      results.every(result => result === SKIPPED)
        ? `Already up to date (${duration}ms)`
        : `Rebuilt in ${duration}ms`
    );
  } catch (error) {
    watchLogger.error(error);
  }
};

/**
 * Debounces rebuilds, and keeps them serialized
 *
 * @param {() => Promise<void>} task - The work to run
 * @returns {{schedule: () => void, cancel: () => void}}
 */
const createScheduler = task => {
  let timer;
  let running = false;
  let queued = false;

  /**
   * @returns {Promise<void>}
   */
  const run = async () => {
    running = true;

    try {
      do {
        queued = false;

        await task();
      } while (queued);
    } catch (error) {
      watchLogger.error(error);
    } finally {
      running = false;
    }
  };

  return {
    /**
     * @returns {void}
     */
    schedule: () => {
      if (running) {
        queued = true;

        return;
      }

      clearTimeout(timer);

      timer = setTimeout(run, DEBOUNCE_MS);
    },

    /**
     * @returns {void}
     */
    cancel: () => clearTimeout(timer),
  };
};

export default insertCommonOptions(new Command('watch'))
  .description('Generate API docs, rebuilding whenever an input file changes')
  .action(
    errorWrap(async opts => {
      const config = await setConfig(opts);
      assertRunnableOptions(config);

      const patterns = config.global.input.map(pattern => resolve(pattern));

      const ignored = (config.global.ignore ?? []).map(pattern =>
        resolve(pattern)
      );

      const scheduler = createScheduler(() => build(config));

      const watcher = watch(patterns.map(globParent), { ignoreInitial: true });

      watcher.on('all', (_event, path) => {
        const target = resolve(path);

        if (
          patterns.some(pattern => matchesGlob(target, pattern)) &&
          !ignored.some(pattern => matchesGlob(target, pattern))
        ) {
          scheduler.schedule();
        }
      });

      watcher.on('error', watchLogger.error);

      /**
       *
       */
      const stop = async () => {
        watchLogger.info('Stopping');

        scheduler.cancel();
        await watcher.close();

        process.exit(0);
      };

      for (const signal of ['SIGINT', 'SIGTERM']) {
        // TODO(@avivkeller): It's confusing for users when CTRL+C is pressed due to
        // the blocking of the main thread
        process.once(signal, stop);
      }

      watchLogger.info(`Watching. Press Ctrl+C to stop`);

      scheduler.schedule();
    })
  );
