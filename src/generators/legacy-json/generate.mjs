'use strict';

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createSectionBuilder } from './utils/buildSection.mjs';
import getConfig from '../../utils/configuration/index.mjs';
import { groupNodesByModule, legacyToJSON } from '../../utils/generators.mjs';

const buildSection = createSectionBuilder();

/**
 * Process a chunk of items in a worker thread.
 * Builds JSON sections - FS operations happen in generate().
 *
 * Each item is pre-grouped {head, nodes} - no need to
 * recompute groupNodesByModule for every chunk.
 *
 * @type {import('./types').Implementation['processChunk']}
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
 * @type {import('./types').Implementation['generate']}
 */
export async function* generate(input, worker) {
  const config = getConfig('legacy-json');

  const groupedModules = groupNodesByModule(input);

  const headNodes = input.filter(node => node.heading.depth === 1);

  // Create sliced input: each item contains head + its module's entries
  // This avoids sending all 4900+ entries to every worker
  const entries = headNodes.map(head => ({
    head,
    nodes: groupedModules.get(head.api),
  }));

  for await (const chunkResult of worker.stream(entries, entries)) {
    if (config.output) {
      for (const section of chunkResult) {
        const out = join(config.output, `${section.api}.json`);

        await writeFile(
          out,
          config.minify ? legacyToJSON(section) : legacyToJSON(section, null, 2)
        );
      }
    }

    yield chunkResult;
  }
}
