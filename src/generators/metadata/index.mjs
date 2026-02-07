'use strict';

import { parseApiDoc } from './utils/parse.mjs';
import getConfig from '../../utils/configuration/index.mjs';
import { importFromURL } from '../../utils/url.mjs';

/**
 * This generator generates a flattened list of metadata entries from a API doc
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'metadata',

  version: '1.0.0',

  description: 'generates a flattened list of API doc metadata entries',

  dependsOn: 'ast',

  defaultConfiguration: {
    typeMap: import.meta.resolve('./typeMap.json'),
  },

  /**
   * Process a chunk of API doc files in a worker thread.
   * Called by chunk-worker.mjs for parallel processing.
   */
  async processChunk(fullInput, itemIndices, typeMap) {
    const results = [];

    for (const idx of itemIndices) {
      results.push(...parseApiDoc(fullInput[idx], typeMap));
    }

    return results;
  },

  /**
   */
  async *generate(inputs, worker) {
    const { metadata: config } = getConfig();

    const typeMap = await importFromURL(config.typeMap);

    // Stream chunks as they complete - allows dependent generators
    // to start collecting/preparing while we're still processing
    for await (const chunkResult of worker.stream(inputs, inputs, typeMap)) {
      yield chunkResult.flat();
    }
  },
};
