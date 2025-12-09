import logger from '../src/logger/index.mjs';

/**
 * Wraps a function to catch both synchronous and asynchronous errors.
 *
 * @param {Function} fn - The function to wrap. Can be synchronous or return a Promise.
 * @returns {Function} A new function that handles errors and logs them.
 */
export const errorWrap =
  fn =>
  async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      logger.error(err);
      process.exit(1);
    }
  };
