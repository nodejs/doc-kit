'use strict';

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import getConfig from '../../utils/configuration/index.mjs';
import { legacyToJSON } from '../../utils/generators.mjs';

export const name = 'legacy-json-all';
export const dependsOn = '@node-core/doc-kit/generators/legacy-json';
export const defaultConfiguration = {
  minify: false,
};

/**
 * Generates the legacy JSON `all.json` file.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input) {
  const config = getConfig('legacy-json-all');

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
    config.index?.map(({ api }, position) => [`doc/api/${api}.md`, position]) ??
      []
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

  if (config.output) {
    await writeFile(
      join(config.output, 'all.json'),
      config.minify
        ? legacyToJSON(generatedValue)
        : legacyToJSON(generatedValue, null, 2)
    );
  }

  return generatedValue;
}
