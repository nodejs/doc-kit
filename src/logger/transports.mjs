import actions from '@actions/core';
import { transports, format } from 'winston';
import TransportStream from 'winston-transport';

/** Pretty-print console transport */
const pretty = () =>
  new transports.Console({
    format: format.combine(
      format.colorize({ all: true }),
      format.printf(
        ({ timestamp, level, message, label = '-', stack = '' }) =>
          `${timestamp} [${label}] ${level}: ${message}${stack.substring(stack.indexOf('\n'))}`
      )
    ),
  });

const actionMap = {
  debug: actions.debug,
  warn: actions.warning,
  warning: actions.warning,
  error: actions.error,
};

/** GitHub Actions transport */
const githubActions = () =>
  new TransportStream({
    /**
     * Logs a message to GitHub Actions.
     *
     * @param {Object} info - Log information.
     * @param {string} info.level - Log level (e.g., 'debug', 'info', 'warn', 'error').
     * @param {string} info.message - Log message.
     * @param {() => void} callback - Callback to signal completion.
     */
    log({ level, message }, callback) {
      (actionMap[level] || actions.notice)(message);
      callback();
    },
  });

export default { pretty, 'github-actions': githubActions };
