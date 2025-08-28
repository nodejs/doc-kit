'use strict';

import { LogLevel } from './constants.mjs';

/**
 * @typedef {import('./types').Metadata} Metadata
 * @typedef {import('./types').LogMessage} LogMessage
 */

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
   * @param {LogMessage} message - Message to log.
   * @param {Metadata} metadata - Additional metadata
   * @returns {void}
   */
  const log = (level, message, metadata = {}) => {
    if (!shouldLog(level)) {
      return;
    }

    if (Array.isArray(message)) {
      return message.forEach(msg => log(level, msg, metadata));
    }

    const timestamp = Date.now();

    // Extract message string from Error object or use message as-is
    const msg = message instanceof Error ? message.message : message;

    transport({
      level,
      message: msg,
      timestamp,
      metadata,
      module,
    });
  };

  /**
   * Logs an info message.
   *
   * @param {LogMessage} message - Info message to log.
   * @param {Metadata} metadata - Additional metadata
   * @returns {void}
   */
  const info = (message, metadata = {}) =>
    log(LogLevel.info, message, metadata);

  /**
   * Logs a warning message.
   *
   * @param {LogMessage} message - Warning message to log.
   * @param {Metadata} metadata - Additional metadata
   * @returns {void}
   */
  const warn = (message, metadata = {}) =>
    log(LogLevel.warn, message, metadata);

  /**
   * Logs an error message or Error object.
   *
   * @param {LogMessage} message - Error message or Error object to log.
   * @param {Metadata} metadata - Additional metadata
   * @returns {void}
   */
  const error = (message, metadata = {}) =>
    log(LogLevel.error, message, metadata);

  /**
   * Logs a fatal error message or Error object.
   *
   * @param {LogMessage} message - Fatal error message or Error object to log.
   * @param {Metadata} metadata - Additional metadata
   * @returns {void}
   */
  const fatal = (message, metadata = {}) =>
    log(LogLevel.fatal, message, metadata);

  /**
   * Logs a debug message.
   *
   * @param {LogMessage} message - Debug message to log.
   * @param {Metadata} metadata - Additional metadata
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
