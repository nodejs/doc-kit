import { setConfig } from '../utils/configuration/index.mjs';

/** @type {Map<string, Promise<{processChunk: Function}>>} */
const generatorCache = new Map();

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

  if (!generatorCache.has(generatorSpecifier)) {
    generatorCache.set(generatorSpecifier, import(generatorSpecifier));
  }

  const { processChunk } = await generatorCache.get(generatorSpecifier);

  return processChunk(input, itemIndices, extra);
};
