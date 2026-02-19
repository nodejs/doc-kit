import { setConfig } from '../utils/configuration/index.mjs';

/**
 * Processes a chunk of items using the specified generator's processChunk method.
 * This is the worker entry point for Piscina.
 *
 * @param {ParallelTaskOptions} opts - Task options from Piscina
 * @returns {Promise<unknown>} The processed result
 */
export default async ({
  generatorName,
  input,
  itemIndices,
  extra,
  configuration,
}) => {
  await setConfig(configuration);

  const { processChunk } = await import(
    `../generators/${generatorName}/generate.mjs`
  );

  return processChunk(input, itemIndices, extra);
};
