import process from 'node:process';

import createLinter from '../../src/linter/index.mjs';
import rules from '../../src/linter/rules/index.mjs';
import { getEnabledRules } from '../../src/linter/utils/rules.mjs';
import { Logger } from '../../src/logger/index.mjs';
import { availableTransports } from '../../src/logger/transports/index.mjs';
import { loadAndParse } from '../utils.mjs';

const availableRules = Object.keys(rules);

/**
 * @typedef {Object} LinterOptions
 * @property {Array<string>|string} input - Glob/path for input files.
 * @property {Array<string>|string} [ignore] - Glob/path for ignoring files.
 * @property {string[]} [disableRule] - Linter rules to disable.
 * @property {boolean} [dryRun] - Dry-run mode.
 * @property {keyof transports} transport - Transport for logger output.
 */

/**
 * @type {import('../utils.mjs').Command}
 */
export default {
  name: 'lint',
  description: 'Run linter independently',
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
    disableRule: {
      flags: ['--disable-rule [rules...]'],
      desc: 'Disable linter rules',
      prompt: {
        type: 'multiselect',
        message: 'Choose rules to disable',
        options: availableRules.map(r => ({ label: r, value: r })),
      },
    },
    dryRun: {
      flags: ['--dry-run'],
      desc: 'Dry run mode',
      prompt: {
        type: 'confirm',
        message: 'Enable dry run mode?',
        initialValue: false,
      },
    },
    transport: {
      flags: ['-r', '--transport <transport>'],
      desc: 'Linter transport to use',
      prompt: {
        type: 'select',
        message: 'Choose a transport',
        options: availableTransports.map(t => ({ label: t, value: t })),
      },
    },
  },

  /**
   * Action for running the linter
   * @param {LinterOptions} opts - Linter options.
   * @returns {Promise<void>}
   */
  async action(opts) {
    const logger = Logger.init(opts.transport);

    try {
      const rules = getEnabledRules(opts.disableRule);
      const linter = createLinter(rules, opts.dryRun);

      await loadAndParse(opts.input, opts.ignore, linter);

      linter.report();

      process.exitCode = +linter.hasError();
    } catch (error) {
      logger.error('Error running the linter:', error);

      process.exitCode = 1;
    }
  },
};
