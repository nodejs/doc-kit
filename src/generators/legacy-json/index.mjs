'use strict';

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createSectionBuilder } from './utils/buildSection.mjs';
import { getHeadNodes, groupNodesByModule } from '../../utils/generators.mjs';

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
   * Called by chunk-worker.mjs for parallel processing.
   *
   * @param {Input} fullInput - Full input to rebuild context
   * @param {number[]} itemIndices - Indices of head nodes to process
   * @param {Partial<GeneratorOptions>} options
   * @returns {Promise<import('./types.d.ts').ModuleSection[]>}
   */
  async processChunk(fullInput, itemIndices, { output }) {
    const buildSection = createSectionBuilder();
    const groupedModules = groupNodesByModule(fullInput);
    const headNodes = getHeadNodes(fullInput);

    const results = [];

    for (const idx of itemIndices) {
      const head = headNodes[idx];
      const nodes = groupedModules.get(head.api);
      const section = buildSection(head, nodes);

      if (output) {
        await writeFile(
          join(output, `${head.api}.json`),
          JSON.stringify(section)
        );
      }

      results.push(section);
    }

    return results;
  },

  /**
   * Generates a legacy JSON file.
   *
   * @param {Input} input
   * @param {Partial<GeneratorOptions>} options
   */
  async generate(input, { output, worker }) {
    const headNodes = getHeadNodes(input);

    return worker.map(headNodes, input, { output });
  },
};
