import { Command, Option } from 'commander';

import { publicGenerators } from '../../src/generators/index.mjs';
import createGenerator from '../../src/generators.mjs';
import { setConfig } from '../../src/utils/configuration/index.mjs';
import { errorWrap } from '../utils.mjs';

const { runGenerators } = createGenerator();

/**
 * @typedef {Object} CLIOptions
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
 */

export default new Command('generate')
  .description('Generate API docs')
  .addOption(new Option('--config-file <path>', 'Config file'))

  // Options that need to be converted into a configuration
  .addOption(
    new Option('-i, --input <patterns...>', 'Input file patterns (glob)')
  )
  .addOption(
    new Option('-t, --target <generator...>', 'Target generator(s)').choices(
      Object.keys(publicGenerators)
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
  .addOption(new Option('--git-ref', 'Git ref URL'))
  .addOption(new Option('--index <url>', 'index.md URL or path'))
  .addOption(new Option('--minify', 'Minify?'))
  .addOption(new Option('--type-map <url>', 'Type map URL or path'))

  .action(
    errorWrap(async opts => {
      const config = await setConfig(opts);
      await runGenerators(config);
    })
  );
