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

  /**
   * Process a chunk of items in a worker thread.
   * Builds JSON sections - FS operations happen in generate().
   *
   * @param {Input} fullInput - Full metadata input for context rebuilding
   * @param {number[]} itemIndices - Indices of head nodes to process
   * @param {Partial<Omit<GeneratorOptions, 'worker'>>} _options - Serializable options (unused)
   * @returns {Promise<import('./types.d.ts').Section[]>} JSON sections for each processed module
   */
  async processChunk(fullInput, itemIndices) {
    const groupedModules = groupNodesByModule(fullInput);

    const headNodes = fullInput.filter(node => node.heading.depth === 1);

    const results = [];

    for (const idx of itemIndices) {
      const head = headNodes[idx];
      const nodes = groupedModules.get(head.api);

      results.push(buildSection(head, nodes));
    }

    return results;
  },

  /**
   * Generates a legacy JSON file.
   *
   * @param {Input} input
   * @param {Partial<GeneratorOptions>} options
   * @returns {AsyncGenerator<Array<import('./types.d.ts').Section>>}
   */
  async *generate(input, { output, worker }) {
    const headNodes = input.filter(node => node.heading.depth === 1);

    const deps = { output };

    for await (const chunkResult of worker.stream(headNodes, input, deps)) {
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
