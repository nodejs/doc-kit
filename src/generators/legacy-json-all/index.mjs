'use strict';

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const PROPERTIES_TO_COPY = [
  'miscs',
  'modules',
  'classes',
  'globals',
  'methods',
];

/**
 * This generator consolidates data from the `legacy-json` generator into a single
 * JSON file (`all.json`).
 *
 * @typedef {Array<import('../legacy-json/types.d.ts').Section>} Input
 *
 * @type {GeneratorMetadata<Input, import('./types.d.ts').Output>}
 */
export default {
  name: 'legacy-json-all',

  version: '1.0.0',

  description:
    'Generates the `all.json` file from the `legacy-json` generator, which includes all the modules in one single file.',

  dependsOn: 'legacy-json',

  /**
   * Process a chunk of sections from the dependency.
   * Extracts and enriches relevant properties for aggregation.
   * @param {Input} fullInput
   * @param {number[]} itemIndices
   */
  processChunk(fullInput, itemIndices) {
    /** @type {import('./types.d.ts').Output} */
    const chunkResult = {
      miscs: [],
      modules: [],
      classes: [],
      globals: [],
      methods: [],
    };

    for (const idx of itemIndices) {
      const section = fullInput[idx];

      // Copy the relevant properties from each section into our chunk result
      for (const property of PROPERTIES_TO_COPY) {
        const items = section[property];

        if (Array.isArray(items)) {
          const enrichedItems = section.source
            ? items.map(item => ({ ...item, source: section.source }))
            : items;

          chunkResult[property].push(...enrichedItems);
        }
      }
    }

    return chunkResult;
  },

  /**
   * Generates the legacy JSON `all.json` file.
   *
   * @param {Input} input
   * @param {Partial<GeneratorOptions>} options
   * @returns {AsyncGenerator<import('./types.d.ts').Output>}
   */
  async *generate(input, { output, worker }) {
    /**
     * The consolidated output object that will contain
     * combined data from all sections in the input.
     *
     * @type {import('./types.d.ts').Output}
     */
    const generatedValue = {
      miscs: [],
      modules: [],
      classes: [],
      globals: [],
      methods: [],
    };

    // Stream chunks as they complete and aggregate results
    for await (const chunkResult of worker.stream(input, input, {})) {
      // Merge chunk result into generatedValue
      for (const property of PROPERTIES_TO_COPY) {
        generatedValue[property].push(...chunkResult[property]);
      }

      yield chunkResult;
    }

    if (output) {
      await writeFile(join(output, 'all.json'), JSON.stringify(generatedValue));
    }
  },
};
