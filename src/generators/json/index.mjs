'use strict';

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { SCHEMA_FILENAME } from './constants.mjs';
import { parseSchema } from './utils/parseSchema.mjs';
import { createSection } from './utils/sections/index.mjs';
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
 * @typedef {Array<import('./generated/generated.d.ts').NodeJsAPIDocumentationSchema>} Output
 *
 * @type {GeneratorMetadata<Input, Output>}
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
   * Process a chunk of items in a worker thread.
   * Builds JSON sections - FS operations happen in generate().
   *
   * Each item is pre-grouped {head, nodes} - no need to
   * recompute groupNodesByModule for every chunk.
   *
   * @param slicedInput
   * @param itemIndices
   * @param root0
   * @param root0.version
   * @returns {Promise<Output>} JSON sections for each processed module
   */
  async processChunk(slicedInput, itemIndices, { version }) {
    /**
     * @type {Output}
     */
    const results = new Array(itemIndices.length);

    for (let i = 0; i < itemIndices.length; i++) {
      const { head, nodes } = slicedInput[itemIndices[i]];

      results[i] = createSection(head, nodes, version.raw);
    }

    return results;
  },

  /**
   * Generates a JSON file
   *
   * @param {Input} input
   * @param {Partial<GeneratorOptions>} param1
   */
  async *generate(input, { output, version, worker }) {
    const groupedModules = groupNodesByModule(input);

    const headNodes = input.filter(node => node.heading.depth === 1);

    // Create sliced input: each item contains head + its module's entries
    const entries = headNodes.map(head => ({
      head,
      nodes: groupedModules.get(head.api),
    }));

    for await (const chunkResult of worker.stream(entries, entries, {
      version,
    })) {
      if (output) {
        for (const section of chunkResult) {
          await writeFile(
            join(output, `${section.api}.json`),
            JSON.stringify(section)
          );
        }
      }

      yield chunkResult;
    }

    if (output) {
      // Parse the JSON schema into an object
      const schema = await parseSchema();

      // Write the parsed JSON schema to the output directory
      await writeFile(join(output, SCHEMA_FILENAME), JSON.stringify(schema));
    }
  },
};
