import { allGenerators } from '../generators/index.mjs';

/**
 * Processes a chunk of items using the specified generator's processChunk method.
 * This is the worker entry point for Piscina.
 *
 * @param {{
 * generatorName: string,
 * fullInput: unknown[],
 * itemIndices: number[],
 * options: object
 * }} opts - Task options from Piscina
 * @returns {Promise<unknown>} The processed result
 */
export default async ({ generatorName, fullInput, itemIndices, options }) => {
  const generator = allGenerators[generatorName];

  return generator.processChunk(fullInput, itemIndices, options);
};
