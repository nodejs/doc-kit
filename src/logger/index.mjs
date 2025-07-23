'use strict';

import { createLogger } from './logger.mjs';

/**
 * Singleton logger instance for consistent logging across the app.
 */
export const Logger = (function () {
  let instance;

  /**
   * Creates a new logger instance.
   *
   * @returns {Logger}
   */
  const createInstance = () => {
    return createLogger();
  };

  /**
   * Returns the singleton logger instance.
   *
   * @returns {Logger}
   */
  const getInstance = () => {
    if (!instance) {
      instance = createInstance();
    }
    return instance;
  };

  return {
    getInstance,
  };
})();
