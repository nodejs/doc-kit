import { Option } from 'commander';

import { publicGenerators } from '../../src/generators/index.mjs';

/**
 * Creates the configuration options shared by every command that resolves a
 * run configuration (`generate`, `serve`): everything a configuration file
 * accepts, plus the configuration file selector itself.
 *
 * A factory (rather than a shared array) because commander `Option`
 * instances belong to the command they are added to.
 *
 * @returns {Option[]}
 */
export const createConfigurationOptions = () => [
  new Option('--config-file <path>', 'Config file'),

  // Options that need to be converted into a configuration
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
];
