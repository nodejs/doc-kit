'use strict';

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createSectionBuilder } from './utils/buildSection.mjs';
import getConfig from '../../utils/configuration/index.mjs';
import { groupNodesByModule, legacyToJSON } from '../../utils/generators.mjs';

const buildSection = createSectionBuilder();

/**
 * This generator is responsible for generating the legacy JSON files for the
 * legacy API docs for retro-compatibility. It is to be replaced while we work
 * on the new schema for this file.
 *
 * This is a top-level generator, intaking the raw AST tree of the api docs.
 * It generates JSON files to the specified output directory given by the
 * config.
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'legacy-json',

  version: '1.0.0',

  description: 'Generates the legacy version of the JSON API docs.',

  dependsOn: 'metadata',

  defaultConfiguration: {
    ref: 'main',
    minify: false,
  },

  /**
   * Process a chunk of items in a worker thread.
   * Builds JSON sections - FS operations happen in generate().
   *
   * Each item is pre-grouped {head, nodes} - no need to
   * recompute groupNodesByModule for every chunk.
   */
  async processChunk(slicedInput, itemIndices) {
    const results = [];

    for (const idx of itemIndices) {
      const { head, nodes } = slicedInput[idx];

      results.push(buildSection(head, nodes));
    }

    return results;
  },

  /**
   * Generates a legacy JSON file.
   */
  async *generate(input, worker) {
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
            config.minify
              ? legacyToJSON(section)
              : legacyToJSON(section, null, 2)
          );
        }
      }

      yield chunkResult;
    }
  },
};
