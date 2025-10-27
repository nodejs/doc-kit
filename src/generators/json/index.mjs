// @ts-check
'use strict';

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createSectionBuilder } from './utils/createSection.mjs';
import { parseSchema } from './utils/parseSchema.mjs';
import { groupNodesByModule } from '../../utils/generators.mjs';

/**
 * This generator is responsible for generating the JSON representation of the
 * docs.
 *
 * This is a top-level generator, intaking the raw AST tree of the api docs.
 * It generates JSON files to the specified output directory given by the
 * config.
 *
 * @typedef {Array<ApiDocMetadataEntry>} Input
 *
 * @type {GeneratorMetadata<Input, Array<import('./generated.d.ts').NodeJsAPIDocumentationSchema>>}
 */
export default {
  name: 'json',

  // This should be kept in sync with the JSON schema version for this
  // generator AND the `json-all` generator
  version: '2.0.0',

  description:
    'This generator is responsible for generating the JSON representation of the docs.',

  dependsOn: 'metadata',

  /**
   * Generates a JSON file.
   *
   * @param {Input} input
   * @param {Partial<GeneratorOptions>} param1
   * @returns {Promise<Array<import('./generated.d.ts').NodeJsAPIDocumentationSchema>>}
   */
  async generate(input, { output }) {
    const groupedModules = groupNodesByModule(input);

    const buildSection = createSectionBuilder();

    /**
     * @param {ApiDocMetadataEntry} head
     * @returns {import('./generated.d.ts').NodeJsAPIDocumentationSchema}
     */
    const processModuleNodes = head => {
      const nodes = groupedModules.get(head.api);
      if (!nodes) {
        throw new TypeError(`no grouped nodes found for ${head.api}`);
      }

      const section = buildSection(head, nodes);

      return section;
    };

    /**
     * @type {Array<import('./generated.d.ts').NodeJsAPIDocumentationSchema>}
     */
    const generatedValues = [];

    // Gets the first nodes of each module, which is considered the "head"
    const headNodes = input.filter(node => node.heading.depth === 1);

    const writeFilePromises = output ? new Array(headNodes.length) : [];

    for (let i = 0; i < headNodes.length; i++) {
      const node = headNodes[i];

      // Get the json for the node's section
      const section = processModuleNodes(node);

      generatedValues.push(section);

      if (output) {
        writeFilePromises[i] = writeFile(
          join(output, `${node.api}.json`),
          JSON.stringify(section, null, 2)
        );
      }
    }

    if (output) {
      await Promise.all(writeFilePromises);

      // Parse the JSON schema into an object
      const schema = await parseSchema();

      // Write the parsed JSON schema to the output directory
      await writeFile(
        join(output, 'node-doc-schema.json'),
        JSON.stringify(schema)
      );
    }

    return generatedValues;
  },
};
