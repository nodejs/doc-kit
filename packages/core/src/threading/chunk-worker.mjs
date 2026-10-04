import { workerData } from 'node:worker_threads';

import { loadGenerator } from '#generators/loader.mjs';
import logger from '#logger/index.mjs';
import { setConfig } from '#utils/configuration/index.mjs';

if (workerData?.logLevel !== undefined) {
  logger.setLogLevel(workerData.logLevel);
}

/**
 * Processes a chunk of items using the specified generator's processChunk method.
 * This is the worker entry point for Piscina.
 *
 * @param {ParallelTaskOptions} opts - Task options from Piscina
 * @returns {Promise<unknown>} The processed result
 */
export default async ({
  generatorSpecifier,
  input,
  itemIndices,
  extra,
  configuration,
}) => {
  await setConfig(configuration);

  const generator = await loadGenerator(generatorSpecifier);

  return generator.processChunk(input, itemIndices, extra);
};
