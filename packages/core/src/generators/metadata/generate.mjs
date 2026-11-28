'use strict';

import { DISABLED_SECTION } from '#incremental/section.mjs';
import getConfig from '#utils/configuration/index.mjs';
import { loadFromURL } from '#utils/loaders.mjs';

/**
 * Process a chunk of API doc files in a worker thread.
 * Called by chunk-worker.mjs for parallel processing.
 *
 * @type {import('./types').Generator['processChunk']}
 */
export async function processChunk(fullInput, itemIndices, typeMap) {
  // Loaded on first use rather than with the generator, so the main thread,
  // which never parses, does not load the TypeScript parser (~40MB of WASM)
  const { parseApiDoc } = await import('./utils/parse.mjs');

  const results = [];

  // One list of entries per file, so each file's result can be stored
  for (const idx of itemIndices) {
    results.push(parseApiDoc(fullInput[idx], typeMap));
  }

  return results;
}

/**
 * Generates a flattened list of metadata entries from API docs. An
 * incremental build only parses the trees that changed.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function* generate(
  inputs,
  worker,
  { incremental = DISABLED_SECTION } = {}
) {
  const { metadata: config } = getConfig();

  const typeMap = config.typeMap
    ? JSON.parse(await loadFromURL(config.typeMap))
    : {};

  await incremental.salt(() => [typeMap]);

  // Stream chunks as they complete - allows dependent generators
  // to start collecting/preparing while we're still processing
  const entries = incremental.reuse(inputs, stale =>
    worker.stream(stale, typeMap)
  );

  for await (const chunkResult of entries) {
    yield chunkResult.flat();
  }
}
