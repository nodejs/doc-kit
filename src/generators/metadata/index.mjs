'use strict';

import { parseApiDoc } from './utils/parse.mjs';

/**
 * This generator generates a flattened list of metadata entries from a API doc
 *
 * @typedef {Array<ParserOutput<import('mdast').Root>>} Input
 * @typedef {Array<ApiDocMetadataEntry>} Output
 *
 * @type {GeneratorMetadata<Input, Output>}
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
   * @param {Input} fullInput - Full input array (parsed API doc files)
   * @param {number[]} itemIndices - Indices of files to process
   * @param {Partial<GeneratorOptions>} deps - Dependencies passed from generate()
   * @returns {Promise<Output>} Metadata entries for processed files
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
   * @param {Partial<GeneratorOptions>} options
   * @returns {AsyncGenerator<Output>}
   */
  async *generate(inputs, { typeMap, worker }) {
    const deps = { typeMap };

    // Stream chunks as they complete - allows dependent generators
    // to start collecting/preparing while we're still processing
    for await (const chunkResult of worker.stream(inputs, inputs, deps)) {
      yield chunkResult.flat();
    }
  },
};
