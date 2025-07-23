import { cpus } from 'node:os';
import { resolve } from 'node:path';

import { coerce } from 'semver';

import {
  DOC_NODE_CHANGELOG_URL,
  DOC_NODE_VERSION,
} from '../../src/constants.mjs';
import { publicGenerators } from '../../src/generators/index.mjs';
import createGenerator from '../../src/generators.mjs';
import createLinter from '../../src/linter/index.mjs';
import { getEnabledRules } from '../../src/linter/utils/rules.mjs';
import { Logger } from '../../src/logger/index.mjs';
import { parseChangelog, parseIndex } from '../../src/parsers/markdown.mjs';
import { loadAndParse } from '../utils.mjs';

const availableGenerators = Object.keys(publicGenerators);

/**
 * @typedef {Object} Options
 * @property {Array<string>|string} input - Specifies the glob/path for input files.
 * @property {Array<string>|string} [ignore] - Specifies the glob/path for ignoring files.
 * @property {Array<keyof publicGenerators>} target - Specifies the generator target mode.
 * @property {string} version - Specifies the target Node.js version.
 * @property {string} changelog - Specifies the path to the Node.js CHANGELOG.md file.
 * @property {string} [gitRef] - Git ref/commit URL.
 * @property {number} [threads] - Number of threads to allow.
 * @property {boolean} [skipLint] - Skip lint before generate.
 */

/**
 * @type {import('../utils.mjs').Command}
 */
export default {
  description: 'Generate API docs',
  name: 'generate',
  options: {
    input: {
      flags: ['-i', '--input <patterns...>'],
      desc: 'Input file patterns (glob)',
      prompt: {
        type: 'text',
        message: 'Enter input glob patterns',
        variadic: true,
        required: true,
      },
    },
    ignore: {
      flags: ['--ignore [patterns...]'],
      desc: 'Ignore patterns (comma-separated)',
      prompt: {
        type: 'text',
        message: 'Enter ignore patterns',
        variadic: true,
      },
    },
    output: {
      flags: ['-o', '--output <dir>'],
      desc: 'Output directory',
      prompt: { type: 'text', message: 'Enter output directory' },
    },
    threads: {
      flags: ['-p', '--threads <number>'],
      prompt: {
        type: 'text',
        message: 'How many threads to allow',
        initialValue: String(Math.max(cpus().length, 1)),
      },
    },
    version: {
      flags: ['-v', '--version <semver>'],
      desc: 'Target Node.js version',
      prompt: {
        type: 'text',
        message: 'Enter Node.js version',
        initialValue: DOC_NODE_VERSION,
      },
    },
    changelog: {
      flags: ['-c', '--changelog <url>'],
      desc: 'Changelog URL or path',
      prompt: {
        type: 'text',
        message: 'Enter changelog URL',
        initialValue: DOC_NODE_CHANGELOG_URL,
      },
    },
    gitRef: {
      flags: ['--git-ref <url>'],
      desc: 'Git ref/commit URL',
      prompt: {
        type: 'text',
        message: 'Enter Git ref URL',
        initialValue: 'https://github.com/nodejs/node/tree/HEAD',
      },
    },
    target: {
      flags: ['-t', '--target [modes...]'],
      desc: 'Target generator modes',
      prompt: {
        required: true,
        type: 'multiselect',
        message: 'Choose target generators',
        options: availableGenerators.map(g => ({
          value: g,
          label: `${publicGenerators[g].name || g} (v${publicGenerators[g].version}) - ${publicGenerators[g].description}`,
        })),
      },
    },
    index: {
      flags: ['--index <path>'],
      desc: 'The index document, for getting the titles of various API docs',
      prompt: {
        message: 'Path to doc/api/index.md',
        type: 'text',
      },
    },
    skipLint: {
      flags: ['--skip-lint'],
      desc: 'Skip lint before generate',
      prompt: {
        type: 'confirm',
        message: 'Skip lint before generate?',
        initialValue: false,
      },
    },
  },
  /**
   * Handles the action for generating API docs
   * @param {Options} opts - The options to generate API docs.
   * @returns {Promise<void>}
   */
  async action(opts) {
    const logger = Logger.init();

    const rules = getEnabledRules(opts.disableRule);
    const linter = opts.skipLint ? undefined : createLinter(rules);

    const docs = await loadAndParse(opts.input, opts.ignore, linter);

    linter?.report();

    if (linter?.hasError()) {
      logger.error('Lint failed; aborting generation.');
      process.exit(1);
    }

    const releases = await parseChangelog(opts.changelog);
    const index = opts.index && (await parseIndex(opts.index));

    const { runGenerators } = createGenerator(docs);

    await runGenerators({
      generators: opts.target,
      input: opts.input,
      output: opts.output && resolve(opts.output),
      version: coerce(opts.version),
      releases,
      gitRef: opts.gitRef,
      threads: parseInt(opts.threads, 10),
      index,
    });
  },
};
