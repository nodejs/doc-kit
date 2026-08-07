import { Option } from 'commander';

import { publicGenerators } from '../src/generators/index.mjs';
import logger from '../src/logger/index.mjs';

/**
 * The options every runnable command accepts, as parsed by commander.
 *
 * @typedef {Object} CLIOptions
 * @property {string} configFile
 * @property {string[]} input
 * @property {string[]} target
 * @property {string[]} ignore
 * @property {string} output
 * @property {number} threads
 * @property {number} chunkSize
 * @property {string} version
 * @property {string} changelog
 * @property {string} gitRef
 * @property {string} index
 * @property {boolean} minify
 * @property {string} typeMap
 * @property {boolean} cache
 * @property {boolean} force
 * @property {string} cacheDir
 */

/**
 * Wraps a function to catch both synchronous and asynchronous errors.
 *
 * @param {Function} fn - The function to wrap. Can be synchronous or return a Promise.
 * @returns {Function} A new function that handles errors and logs them.
 */
export const errorWrap =
  fn =>
  async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      logger.error(err);
      process.exit(1);
    }
  };

/**
 * Adds the options shared by every command that resolves a configuration and
 * runs generators.
 *
 * @template {import('commander').Command} T
 * @param {T} cmd - The command to extend
 * @returns {T} The same command, for chaining
 */
export const insertCommonOptions = cmd =>
  cmd
    .addOption(new Option('--config-file <path>', 'Config file'))

    // Options that need to be converted into a configuration
    .addOption(
      new Option('-i, --input <patterns...>', 'Input file patterns (glob)')
    )
    .addOption(
      new Option(
        '-t, --target <generator...>',
        'Target generator(s): a built-in name ' +
          `(${Object.keys(publicGenerators).join(', ')}) ` +
          'or an import specifier for a custom generator'
      )
    )
    .addOption(
      new Option('--ignore <patterns...>', 'Ignore file patterns (glob)')
    )
    .addOption(new Option('-o, --output <directory>', 'The output directory'))
    .addOption(
      new Option(
        '-p, --threads <number>',
        'Number of threads to use (minimum: 1)'
      )
    )
    .addOption(
      new Option(
        '--chunk-size <number>',
        'Number of items to process per worker thread (minimum: 1)'
      )
    )
    .addOption(new Option('-v, --version <semver>', 'Target Node.js version'))
    .addOption(new Option('-c, --changelog <url>', 'Changelog URL or path'))
    .addOption(new Option('--git-ref <ref>', 'Git ref'))
    .addOption(new Option('--index <url>', 'index.md URL or path'))
    .addOption(new Option('--minify', 'Minify?'))
    .addOption(new Option('--type-map <url>', 'Type map URL or path'))
    .addOption(
      new Option('--no-cache', 'Disable the on-disk build cache entirely')
    )
    .addOption(
      new Option(
        '--force',
        'Ignore existing cache entries (the cache is still written)'
      )
    )
    .addOption(new Option('--cache-dir <path>', 'Build cache directory'));
