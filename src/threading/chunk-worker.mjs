import { parentPort } from 'node:worker_threads';

import { allGenerators } from '../generators/index.mjs';

/**
 * Handles incoming work requests from the parent thread.
 * Processes a chunk of items using the specified generator's processChunk method.
 *
 * @param {{
 * generatorName: string,
 * fullInput: unknown[],
 * itemIndices: number[],
 * options: object
 * }} opts - Task options from parent thread
 * @returns {Promise<void>}
 */
const handleWork = async opts => {
  const { generatorName, fullInput, itemIndices, options } = opts;

  try {
    const generator = allGenerators[generatorName];

    const result = await generator.processChunk(
      fullInput,
      itemIndices,
      options
    );

    parentPort.postMessage(result);
  } catch (error) {
    parentPort.postMessage({ error: error.message });
  }
};

parentPort.on('message', handleWork);
