'use strict';

import { parseApiDoc } from './utils/parse.mjs';

/**
 * This generator generates a flattened list of metadata entries from a API doc
 *
 * @typedef {Array<ParserOutput<import('mdast').Root>>} Input
 *
 * @type {GeneratorMetadata<Input, Array<ApiDocMetadataEntry>>}
 */
export default {
  name: 'metadata',

  version: '1.0.0',

  description: 'generates a flattened list of API doc metadata entries',

  dependsOn: 'ast',

  /**
   * Process a chunk of API doc files in a worker thread.
   * Called by chunk-worker.mjs for parallel processing.
   *
   * @param {Input} fullInput - Full input array
   * @param {number[]} itemIndices - Indices of items to process
   * @param {Partial<GeneratorOptions>} options
   */
  async processChunk(fullInput, itemIndices, { typeMap }) {
    const results = [];

    for (const idx of itemIndices) {
      results.push(...parseApiDoc(fullInput[idx], typeMap));
    }

    return results;
  },

  /**
   * @param {Input} inputs
   * @param {GeneratorOptions} options
   * @returns {Promise<Array<ApiDocMetadataEntry>>}
   */
  async generate(inputs, { typeMap, worker }) {
    const results = await worker.map(inputs, inputs, { typeMap });

    return results.flat();
  },
};
