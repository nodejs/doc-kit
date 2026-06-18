'use strict';

import { join } from 'node:path';

import { createSectionBuilder } from './utils/buildSection.mjs';
import getConfig from '../../utils/configuration/index.mjs';
import { writeFile, withExt } from '../../utils/file.mjs';
import { groupNodesByModule, legacyToJSON } from '../../utils/generators.mjs';

const buildSection = createSectionBuilder();

/**
 * Process a chunk of items in a worker thread.
 * Builds JSON sections - FS operations happen in generate().
 *
 * Each item is pre-grouped {head, nodes} - no need to
 * recompute groupNodesByModule for every chunk.
 *
 * @type {import('./types').Generator['processChunk']}
 */
export async function processChunk(slicedInput, itemIndices) {
  const results = [];

  for (const idx of itemIndices) {
    const { head, nodes } = slicedInput[idx];

    results.push(buildSection(head, nodes));
  }

  return results;
}

/**
 * Generates a legacy JSON file.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function* generate(input, worker) {
  const config = getConfig('legacy-json');

  const groupedModules = groupNodesByModule(input);

  const headNodes = input.filter(node => node.heading.depth === 1);

  // Map each section's `api` slug back to its source path so the output keeps
  // the input directory structure instead of flattening into the root.
  const pathByApi = new Map(headNodes.map(({ api, path }) => [api, path]));

  // Create sliced input: each item contains head + its module's entries
  // This avoids sending all 4900+ entries to every worker
  const entries = headNodes.map(head => ({
    head,
    nodes: groupedModules.get(head.api),
  }));

  for await (const chunkResult of worker.stream(entries)) {
    if (config.output) {
      for (const section of chunkResult) {
        const out = join(
          config.output,
          withExt(pathByApi.get(section.api), 'json')
        );

        await writeFile(
          out,
          config.minify ? legacyToJSON(section) : legacyToJSON(section, null, 2)
        );
      }
    }

    yield chunkResult;
  }
}
