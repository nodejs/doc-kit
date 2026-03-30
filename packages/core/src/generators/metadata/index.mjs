'use strict';

import { parseApiDoc } from './utils/parse.mjs';
import { parseTypeMap } from '../../parsers/json.mjs';
import getConfig from '../../utils/configuration/index.mjs';

export const name = 'metadata';
export const dependsOn = '@node-core/doc-kit/generators/ast';
export const defaultConfiguration = {
  typeMap: import.meta.resolve('./typeMap.json'),
};

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

  const typeMap = await parseTypeMap(config.typeMap);

  // Stream chunks as they complete - allows dependent generators
  // to start collecting/preparing while we're still processing
  for await (const chunkResult of worker.stream(inputs, typeMap)) {
    yield chunkResult.flat();
  }
}
