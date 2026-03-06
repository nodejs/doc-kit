'use strict';

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { remove } from 'unist-util-remove';

import getConfig from '../../utils/configuration/index.mjs';
import { UNIST } from '../../utils/queries/index.mjs';

/**
 * Generates the simplified JSON version of the API docs
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input) {
  const config = getConfig('json-simple');

  // Iterates the input (MetadataEntry) and performs a few changes
  const mappedInput = input.map(node => {
    // Deep clones the content nodes to avoid affecting upstream nodes
    const content = JSON.parse(JSON.stringify(node.content));

    // Removes numerous nodes from the content that should not be on the "body"
    // of the JSON version of the API docs as they are already represented in the metadata
    remove(content, [UNIST.isStabilityNode, UNIST.isHeading]);

    return { ...node, content };
  });

  if (config.output) {
    // Writes all the API docs stringified content into one file
    // Note: The full JSON generator in the future will create one JSON file per top-level API doc file
    await writeFile(
      join(config.output, 'api-docs.json'),
      config.minify
        ? JSON.stringify(mappedInput)
        : JSON.stringify(mappedInput, null, 2)
    );
  }

  return mappedInput;
}
