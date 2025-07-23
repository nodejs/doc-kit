'use strict';

import { LogLevel } from './constants.mjs';

/**
 * Creates a logger instance with the specified transport, log level and an
 * optional module name.
 *
 * @param {import('./types').Transport} transport - Function to handle log output.
 * @param {number} [loggerLevel] - Minimum log level to output.
 * @param {string} [module] - Optional module name for the logger.
 */
export const createLogger = (
  transport,
  loggerLevel = LogLevel.info,
  module
) => {
  /**
   * Logs a message at the given level with optional metadata.
   *
   * @param {number} level - Log level for the message.
   * @param {string} message - Message to log.
   * @param {import('./types').Metadata} metadata - Additional metadata
   */
  const log = (level, message, metadata = {}) => {
    if (!shouldLog(level)) {
      return;
    }

    const timestamp = Date.now();

    transport({
      level,
      message,
      timestamp,
      metadata,
      ...(module && { module }),
    });
  };

  /**
   * Logs an info message.
   *
   * @param {string} message - Info message to log.
   * @param {import('./types').Metadata} metadata - Additional metadata
   * @returns {void}
   */
  const info = (message, metadata = {}) =>
    log(LogLevel.info, message, metadata);

  /**
   * Logs a warning message.
   *
   * @param {string} message - Warning message to log.
   * @param {import('./types').Metadata} metadata - Additional metadata
   * @returns {void}
   */
  const warn = (message, metadata = {}) =>
    log(LogLevel.warn, message, metadata);

  /**
   * Logs an error message or Error object.
   *
   * @param {string | Error} input - Error message or Error object to log.
   * @param {import('./types').Metadata} metadata - Additional metadata
   * @returns {void}
   */
  const error = (input, metadata = {}) => {
    const message = typeof input === 'string' ? input : input.message;

    log(LogLevel.error, message, metadata);
  };

  /**
   * Logs a fatal error message or Error object.
   *
   * @param {string | Error} input - Fatal error message or Error object to log.
   * @param {import('./types').Metadata} metadata - Additional metadata
   * @returns {void}
   */
  const fatal = (input, metadata = {}) => {
    const message = typeof input === 'string' ? input : input.message;

    log(LogLevel.fatal, message, metadata);
  };

  /**
   * Logs a debug message.
   *
   * @param {string} message - Debug message to log.
   * @param {import('./types').Metadata} metadata - Additional metadata
   * @returns {void}
   */
  const debug = (message, metadata = {}) =>
    log(LogLevel.debug, message, metadata);

  /**
   * Creates a child logger for a specific module.
   *
   * @param {string} module - Module name for the child logger.
   * @returns {ReturnType<typeof createLogger>}
   */
  const child = module => createLogger(transport, loggerLevel, module);

  /**
   * Checks if the given log level should be logged based on the current logger
   * level.
   *
   * @param {number} level - Log level to check.
   * @returns {boolean}
   */
  const shouldLog = level => {
    return level >= loggerLevel;
  };

  return {
    info,
    warn,
    error,
    fatal,
    debug,
    child,
  };
};
