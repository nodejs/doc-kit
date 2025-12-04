'use strict';

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createSectionBuilder } from './utils/buildSection.mjs';
import { groupNodesByModule } from '../../utils/generators.mjs';

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
   * Generates a legacy JSON file.
   *
   * @param {Input} input
   * @param {Partial<GeneratorOptions>} options
   */
  async generate(input, { output }) {
    const buildSection = createSectionBuilder();

    // This array holds all the generated values for each module
    const generatedValues = [];

    const groupedModules = groupNodesByModule(input);

    // Gets the first nodes of each module, which is considered the "head"
    const headNodes = input.filter(node => node.heading.depth === 1);

    /**
     * @param {ApiDocMetadataEntry} head
     * @returns {import('./types.d.ts').ModuleSection}
     */
    const processModuleNodes = head => {
      const nodes = groupedModules.get(head.api);

      const section = buildSection(head, nodes);

      generatedValues.push(section);

      return section;
    };

    await Promise.all(
      headNodes.map(async node => {
        // Get the json for the node's section
        const section = processModuleNodes(node);

        // Write it to the output file
        if (output) {
          await writeFile(
            join(output, `${node.api}.json`),
            JSON.stringify(section)
          );
        }
      })
    );

    return generatedValues;
  },
};
