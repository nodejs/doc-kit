import process from 'node:process';

import createLinter from '../../src/linter/index.mjs';
import reporters from '../../src/linter/reporters/index.mjs';
import rules from '../../src/linter/rules/index.mjs';
import { getEnabledRules } from '../../src/linter/utils/rules.mjs';
import { Logger } from '../../src/logger/index.mjs';
import { loadAndParse } from '../utils.mjs';

const availableRules = Object.keys(rules);
const availableReporters = Object.keys(reporters);

/**
 * @typedef {Object} LinterOptions
 * @property {Array<string>|string} input - Glob/path for input files.
 * @property {Array<string>|string} [ignore] - Glob/path for ignoring files.
 * @property {string[]} [disableRule] - Linter rules to disable.
 * @property {boolean} [dryRun] - Dry-run mode.
 * @property {keyof reporters} reporter - Reporter for linter output.
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
    reporter: {
      flags: ['-r', '--reporter <reporter>'],
      desc: 'Linter reporter to use',
      prompt: {
        type: 'select',
        message: 'Choose a reporter',
        options: availableReporters.map(r => ({ label: r, value: r })),
      },
    },
  },

  /**
   * Action for running the linter
   * @param {LinterOptions} opts - Linter options.
   * @returns {Promise<void>}
   */
  async action(opts) {
    try {
      const rules = getEnabledRules(opts.disableRule);
      const linter = createLinter(rules, opts.dryRun);

      await loadAndParse(opts.input, opts.ignore, linter);

      linter.report();

      process.exitCode = +linter.hasError();
    } catch (error) {
      Logger.getInstance().error('Error running the linter:', error);
      process.exitCode = 1;
    }
  },
};
