'use strict';

import { parseApiDoc } from './utils/parse.mjs';
import getConfig from '../../utils/configuration/index.mjs';
import { loadFromURL } from '../../utils/loaders.mjs';

/**
 * Process a chunk of API doc files in a worker thread.
 * Called by chunk-worker.mjs for parallel processing.
 *
 * @type {import('./types').Generator['processChunk']}
 */
export async function processChunk(fullInput, itemIndices, typeMap) {
  const results = [];

  for (const idx of itemIndices) {
    results.push(...parseApiDoc(fullInput[idx], typeMap));
  }

  return results;
}

/**
 * Generates a flattened list of metadata entries from API docs.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function* generate(inputs, worker) {
  const { metadata: config } = getConfig();

  // The build cache resolves a string typeMap into its parsed object during
  // setup (its content participates in cache keys); with the cache disabled
  // the string arrives here untouched.
  const typeMap =
    typeof config.typeMap === 'string'
      ? JSON.parse(await loadFromURL(config.typeMap))
      : (config.typeMap ?? {});

  // Stream chunks as they complete - allows dependent generators
  // to start collecting/preparing while we're still processing
  for await (const chunkResult of worker.stream(inputs, typeMap)) {
    yield chunkResult.flat();
  }
}
