'use strict';

import { join } from 'node:path';

import { remove } from 'unist-util-remove';

import getConfig from '../../utils/configuration/index.mjs';
import { writeFile } from '../../utils/file.mjs';
import { UNIST } from '../../utils/queries/index.mjs';

/**
 * Generates the simplified JSON version of the API docs
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input) {
  const config = getConfig('json-simple');

  input.forEach(node =>
    remove(node.content, [UNIST.isStabilityNode, UNIST.isHeading])
  );

  if (config.output) {
    // Writes all the API docs stringified content into one file
    // Note: The full JSON generator in the future will create one JSON file per top-level API doc file
    await writeFile(
      join(config.output, 'api-docs.json'),
      config.minify ? JSON.stringify(input) : JSON.stringify(input, null, 2)
    );
  }

  return input;
}
