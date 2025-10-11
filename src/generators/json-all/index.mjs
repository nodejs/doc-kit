// @ts-check
'use strict';

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DOC_NODE_VERSION } from '../../constants.mjs';
import { generateJsonSchema } from './util/generateJsonSchema.mjs';

// TODO add test w/ https://www.npmjs.com/package/jsonschema

/**
 * TODO docs
 *
 * @typedef {Array<ApiDocMetadataEntry>} Input
 *
 * @type {GeneratorMetadata<Input, object>}
 */
export default {
  name: 'json-all',

  // This should be kept in sync with the JSON schema version for this
  // generator AND the `json` generator
  version: '2.0.0',

  description: 'TODO',

  dependsOn: 'json',

  /**
   * Generates a JSON file.
   *
   * @param {Input} input
   * @param {Partial<GeneratorOptions>} param1
   * @returns {Promise<object>}
   */
  async generate(input, { output }) {
    const generatedValue = {
      $schema: `https://nodejs.org/docs/${DOC_NODE_VERSION}/api/node-doc-all-schema.jsonc`,
      modules: [],
      text: [],
    };

    const propertiesToIgnore = ['$schema', 'source'];

    input.forEach(section => {
      const copiedSection = {};

      Object.keys(section).forEach(key => {
        if (!propertiesToIgnore.includes(key)) {
          copiedSection[key] = section[key];
        }
      });

      switch (section.type) {
        case 'module':
          generatedValue.modules.push(copiedSection);
          break;
        case 'text':
          generatedValue.text.push(copiedSection);
          break;
        default:
          throw new TypeError(`unsupported root section type ${section.type}`);
      }
    });

    if (output) {
      const schema = generateJsonSchema();

      // Write the parsed JSON schema to the output directory
      await writeFile(
        join(output, 'node-doc-schema.json'),
        JSON.stringify(schema)
      );
    }

    return generatedValue;
  },
};
