'use strict';

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createSectionBuilder } from './utils/buildSection.mjs';
import { groupNodesByModule } from '../../utils/generators.mjs';

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
 * @typedef {Array<ApiDocMetadataEntry>} Input
 *
 * @type {GeneratorMetadata<Input, import('./types.d.ts').Section[]>}
 */
export default {
  name: 'legacy-json',

  version: '1.0.0',

  description: 'Generates the legacy version of the JSON API docs.',

  dependsOn: 'metadata',

  processChunk: Object.assign(
    /**
     * Process a chunk of items in a worker thread.
     * Builds JSON sections - FS operations happen in generate().
     *
     * With sliceInput, each item is pre-grouped {head, nodes} - no need to
     * recompute groupNodesByModule for every chunk.
     *
     * @param {Array<{head: ApiDocMetadataEntry, nodes: ApiDocMetadataEntry[]}>} slicedInput - Pre-sliced module data
     * @param {number[]} itemIndices - Indices into the sliced array
     * @returns {Promise<import('./types.d.ts').Section[]>} JSON sections for each processed module
     */
    async (slicedInput, itemIndices) => {
      const results = [];

      for (const idx of itemIndices) {
        const { head, nodes } = slicedInput[idx];

        results.push(buildSection(head, nodes));
      }

      return results;
    },
    { sliceInput: true }
  ),

  /**
   * Generates a legacy JSON file.
   *
   * @param {Input} input
   * @param {Partial<GeneratorOptions>} options
   * @returns {AsyncGenerator<Array<import('./types.d.ts').Section>>}
   */
  async *generate(input, { output, worker }) {
    const groupedModules = groupNodesByModule(input);

    const headNodes = input.filter(node => node.heading.depth === 1);

    // Create sliced input: each item contains head + its module's entries
    // This avoids sending all 4900+ entries to every worker
    const slicedInput = headNodes.map(head => ({
      head,
      nodes: groupedModules.get(head.api),
    }));

    for await (const chunkResult of worker.stream(slicedInput, slicedInput)) {
      if (output) {
        for (const section of chunkResult) {
          const out = join(output, `${section.api}.json`);

          await writeFile(out, JSON.stringify(section));
        }
      }

      yield chunkResult;
    }
  },
};
