'use strict';

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

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
   * Generates the legacy JSON `all.json` file.
   *
   * @param {Input} input
   * @param {Partial<GeneratorOptions>} options
   */
  async generate(input, { output }) {
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

    const propertiesToCopy = [
      'miscs',
      'modules',
      'classes',
      'globals',
      'methods',
    ];

    input.forEach(section => {
      // Copy the relevant properties from each section into our output
      propertiesToCopy.forEach(property => {
        const items = section[property];

        if (Array.isArray(items)) {
          const enrichedItems = section.source
            ? items.map(item => ({ ...item, source: section.source }))
            : items;

          generatedValue[property].push(...enrichedItems);
        }
      });
    });

    if (output) {
      await writeFile(join(output, 'all.json'), JSON.stringify(generatedValue));
    }

    return generatedValue;
  },
};
