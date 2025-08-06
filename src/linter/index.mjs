'use strict';

import createContext from './context.mjs';
import { Logger } from '../logger/index.mjs';

/**
 * Creates a linter instance to validate API documentation ASTs against a
 * defined set of rules.
 *
 * @param {import('./types').LintRule[]} rules - Lint rules to apply
 * @param {boolean} [dryRun] - If true, the linter runs without reporting
 * @returns {import('./types').Linter}
 */
const createLinter = (rules, dryRun = false) => {
  /**
   * Lint issues collected during validations.
   *
   * @type {Array<import('./types').LintIssue>}
   */
  const issues = [];

  /**
   * Lints a API doc and collects issues.
   *
   * @param {import('vfile').VFile} file
   * @param {import('mdast').Root} tree
   * @returns {void}
   */
  const lint = (file, tree) => {
    const context = createContext(file, tree);

    for (const rule of rules) {
      rule(context);
    }

    issues.push(...context.getIssues());
  };

  /**
   * Reports collected issues using the default logger.
   *
   * @returns {void}
   */
  const report = () => {
    if (dryRun) {
      return;
    }

    for (const issue of issues) {
      logIssue(issue);
    }
  };

  /**
   * Logs an issue using the default logger instance.
   *
   * @param {import('./types').LintIssue} issue
   * @returns {void}
   */
  const logIssue = issue => {
    const logger = Logger.getInstance();

    const logFn = logger[issue.level];

    logFn(issue.message, {
      file: {
        path: issue.location.path,
        position: issue.location.position,
      },
    });
  };

  /**
   * Checks if any error-level issues were collected.
   *
   * @returns {boolean}
   */
  const hasError = () => {
    return issues.some(issue => issue.level === 'error');
  };

  return {
    issues,
    lint,
    report,
    hasError,
  };
};

export default createLinter;
