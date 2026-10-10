import { getHeapStatistics } from 'node:v8';

/**
 * Test generator that reports the heap limit of the worker it runs in, so the
 * worker pool's resource limits can be asserted.
 *
 * @type {GeneratorMetadata<unknown, number[]>}
 */
export default {
  name: 'heap-limit-reporter',
  version: '1.0.0',
  description: 'Reports the heap limit of the worker it runs in',
  dependsOn: 'ast',
  processChunk: async (_input, itemIndices) =>
    itemIndices.map(() => getHeapStatistics().heap_size_limit),
  async generate() {
    return [getHeapStatistics().heap_size_limit];
  },
};
