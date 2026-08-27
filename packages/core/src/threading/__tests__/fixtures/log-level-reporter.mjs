import logger from '#logger/index.mjs';

/**
 * Test generator that reports the log level seen inside the worker, so the
 * propagation of the level across the thread boundary can be asserted.
 *
 * @type {GeneratorMetadata<unknown, number[]>}
 */
export default {
  name: 'log-level-reporter',
  version: '1.0.0',
  description: 'Reports the log level active inside the worker',
  dependsOn: 'ast',
  processChunk: async (_input, itemIndices) =>
    itemIndices.map(() => logger.getLogLevel()),
  async generate() {
    return [logger.getLogLevel()];
  },
};
