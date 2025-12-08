'use strict';

import { LogLevel } from './constants.mjs';
import { createLogger } from './logger.mjs';
import { transports } from './transports/index.mjs';

/**
 * @typedef {ReturnType<typeof createLogger>} LoggerInstance
 */

/**
 * Creates a new logger instance with the specified transport.
 *
 * @param {string} [transportName='console'] - Name of the transport to use.
 * @returns {LoggerInstance}
 */
export const Logger = (transportName = 'console') => {
  const transport = transports[transportName];

  if (!transport) {
    throw new Error(`Transport '${transportName}' not found.`);
  }

  return createLogger(transport);
};

// Default logger instance using console transport
export default Logger();

export { LogLevel };
