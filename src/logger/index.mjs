'use strict';

import { createLogger } from './logger.mjs';
import { transports } from './transports/index.mjs';

/**
 * @typedef {ReturnType<typeof createLogger>} LoggerInstance
 */

/**
 * Singleton logger instance for consistent logging across the app.
 */
export const Logger = (() => {
  /**
   * @type {LoggerInstance}
   */
  let instance;

  /**
   * Inits the logger with the specified transport.
   *
   * @param {string} [transportName]
   * @returns {LoggerInstance}
   */
  function init(transportName = 'console') {
    const transport = transports[transportName];

    if (!transport) {
      throw new Error(`Transport '${transportName}' not found.`);
    }

    instance = createLogger(transport);
    return instance;
  }

  /**
   * Returns the singleton logger instance.
   *
   * @returns {LoggerInstance}
   */
  function getInstance() {
    if (!instance) {
      throw new Error(
        'Logger not initialized. Call Logger.init(transportName) first.'
      );
    }

    return instance;
  }

  return {
    init,
    getInstance,
  };
})();
