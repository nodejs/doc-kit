import createGenerator from '@doc-kit/core';
import { publicGenerators } from '@doc-kit/core/generators/index.mjs';
import {
  assertRunnableOptions,
  setConfig,
} from '@doc-kit/core/utils/configuration/index.mjs';
import { Command, Option } from 'commander';

import { errorWrap } from '../utils.mjs';

const { runGenerators } = createGenerator();

/**
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
 * @property {boolean} experimentalIncremental
 */

/**
 * The `generate` options, also shared with the `preview` command, which
 * builds on demand when any of them is passed
 */
export const generateOptions = [
  new Option('--config-file <path>', 'Config file'),
  new Option('-i, --input <patterns...>', 'Input file patterns (glob)'),
  new Option(
    '-t, --target <generator...>',
    'Target generator(s): a built-in name ' +
      `(${Object.keys(publicGenerators).join(', ')}) ` +
      'or an import specifier for a custom generator'
  ),
  new Option('--ignore <patterns...>', 'Ignore file patterns (glob)'),
  new Option('-o, --output <directory>', 'The output directory'),
  new Option('-p, --threads <number>', 'Number of threads to use (minimum: 1)'),
  new Option(
    '--chunk-size <number>',
    'Number of items to process per worker thread (minimum: 1)'
  ),
  new Option('-v, --version <semver>', 'Target Node.js version'),
  new Option('-c, --changelog <url>', 'Changelog URL or path'),
  new Option('--git-ref <ref>', 'Git ref'),
  new Option('--index <url>', 'index.md URL or path'),
  new Option('--minify', 'Minify?'),
  new Option('--type-map <url>', 'Type map URL or path'),
  new Option(
    '--experimental-incremental',
    'Rebuild only what changed against the existing output (experimental)'
  ),
];

const generate = new Command('generate').description('Generate API docs');

generateOptions.forEach(option => generate.addOption(option));

export default generate.action(
  errorWrap(async opts => {
    const config = await setConfig(opts);
    assertRunnableOptions(config);

    await runGenerators(config);
  })
);
