'use strict';

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { remove } from 'unist-util-remove';

import createQueries from '../../utils/queries/index.mjs';

/**
 * This generator generates a simplified JSON version of the API docs and returns it as a string
 * this is not meant to be used for the final API docs, but for debugging and testing purposes
 *
 * This generator is a top-level generator, and it takes the raw AST tree of the API doc files
 * and returns a stringified JSON version of the API docs.
 *
 * @typedef {Array<ApiDocMetadataEntry>} Input
 *
 * @type {GeneratorMetadata<Input, string>}
 */
export default {
  name: 'json-simple',

  version: '1.0.0',

  description:
    'Generates the simple JSON version of the API docs, and returns it as a string',

  dependsOn: 'metadata',

  /**
   * Generates the simplified JSON version of the API docs
   * @param {Input} input
   * @param {Partial<GeneratorOptions>} options
   */
  async generate(input, options) {
    // Iterates the input (ApiDocMetadataEntry) and performs a few changes
    const mappedInput = input.map(node => {
      // Deep clones the content nodes to avoid affecting upstream nodes
      const content = JSON.parse(JSON.stringify(node.content));

      // Removes numerous nodes from the content that should not be on the "body"
      // of the JSON version of the API docs as they are already represented in the metadata
      remove(content, [
        createQueries.UNIST.isStabilityNode,
        createQueries.UNIST.isHeading,
      ]);

      return { ...node, content };
    });

    // This simply grabs all the different files and stringifies them
    const stringifiedContent = JSON.stringify(mappedInput, null, 2);

    if (options.output) {
      // Writes all the API docs stringified content into one file
      // Note: The full JSON generator in the future will create one JSON file per top-level API doc file
      await writeFile(
        join(options.output, 'api-docs.json'),
        stringifiedContent
      );
    }

    return mappedInput;
  },
};
