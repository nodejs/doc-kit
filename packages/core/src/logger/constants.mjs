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

/**
 * Maps log level numbers to the GitHub Actions workflow commands reporting
 * them.
 */
export const levelToGitHubCommand = {
  [LogLevel.debug]: 'debug',
  [LogLevel.info]: 'notice',
  [LogLevel.warn]: 'warning',
  [LogLevel.error]: 'error',
  [LogLevel.fatal]: 'error',
};

/**
 * Maps the characters a workflow command's message can't hold to their
 * escapes. A command is a line, `::command key=value,key=value::message`,
 * so its message, which runs to the end of the line, can't break it, nor hold
 * the `%` an escape starts with.
 */
export const commandDataEscapes = {
  '%': '%25',
  '\r': '%0D',
  '\n': '%0A',
};

/**
 * Maps the characters a workflow command's property can't hold to their
 * escapes: those its message can't, and the `,` separating properties and
 * the `:` of the `::` ending them.
 */
export const commandPropertyEscapes = {
  ...commandDataEscapes,
  ':': '%3A',
  ',': '%2C',
};
