import { Command } from 'commander';

import { createConfigurationOptions } from './options.mjs';
import createGenerator from '../../src/generators.mjs';
import {
  assertRunnableOptions,
  setConfig,
} from '../../src/utils/configuration/index.mjs';
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
 */

const generate = new Command('generate').description('Generate API docs');

createConfigurationOptions().forEach(option => generate.addOption(option));

export default generate.action(
  errorWrap(async opts => {
    const config = await setConfig(opts);
    assertRunnableOptions(config);

    await runGenerators(config);
  })
);
