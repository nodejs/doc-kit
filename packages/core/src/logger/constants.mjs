'use strict';

/**
 * Numeric log level definitions.
 */
export const LogLevel = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

/**
 * Maps log level numbers to their string tags.
 */
export const levelTags = {
  [LogLevel.debug]: 'DEBUG',
  [LogLevel.info]: 'INFO',
  [LogLevel.warn]: 'WARN',
  [LogLevel.error]: 'ERROR',
  [LogLevel.fatal]: 'FATAL',
};

/**
 * Maps log level numbers to CLI color names.
 */
export const levelToColorMap = {
  [LogLevel.debug]: 'blue',
  [LogLevel.info]: 'green',
  [LogLevel.warn]: 'yellow',
  [LogLevel.error]: 'magenta',
  [LogLevel.fatal]: 'red',
};
