'use strict';

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * This generator consolidates data from the `legacy-json` generator into a single
 * JSON file (`all.json`).
 *
 * @typedef {Array<import('../legacy-json/types.d.ts').Section>} Input
 * @typedef {import('./types.d.ts').Output} Output
 *
 * @type {GeneratorMetadata<Input, Output>}
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
   * @returns {Promise<Output>}
   */
  async generate(input, { output, index }) {
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

    /**
     * The properties to copy from each section in the input
     */
    const propertiesToCopy = Object.keys(generatedValue);

    // Create a map of api name to index position for sorting
    const indexOrder = new Map(
      index?.map(({ api }, position) => [`doc/api/${api}.md`, position]) ?? []
    );

    // Sort input by index order (documents not in index go to the end)
    const sortedInput = input.toSorted((a, b) => {
      const aOrder = indexOrder.get(a.source) ?? Infinity;
      const bOrder = indexOrder.get(b.source) ?? Infinity;

      return aOrder - bOrder;
    });

    // Aggregate all sections into the output
    for (const section of sortedInput) {
      // Skip index.json - it has no useful content, just navigation
      if (section.api === 'index') {
        continue;
      }

      for (const property of propertiesToCopy) {
        const items = section[property];

        if (Array.isArray(items)) {
          const enrichedItems = section.source
            ? items.map(item => ({ ...item, source: section.source }))
            : items;

          generatedValue[property].push(...enrichedItems);
        }
      }
    }

    if (output) {
      await writeFile(
        join(output, 'all.json'),
        JSON.stringify(
          section,
          [
            // TODO: remove this array once all the additional keys have been introduced downstream
            'added',
            'changes',
            'classes',
            'classMethods',
            'commit',
            'ctors',
            'default',
            'deprecated',
            'desc',
            'description',
            'displayName',
            'events',
            'examples',
            'globals',
            'introduced_in',
            'meta',
            'methods',
            'miscs',
            'name',
            'napiVersion',
            'options',
            'params',
            'pr-url',
            'properties',
            'removed',
            'return',
            'shortDesc',
            'signatures',
            'source',
            'stability',
            'stabilityText',
            'textRaw',
            'type',
            'version',
          ],
          2,
        )
      );
    }

    return generatedValue;
  },
};
