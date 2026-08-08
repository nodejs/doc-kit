'use strict';

import { join } from 'node:path';

import getConfig from '../../utils/configuration/index.mjs';
import { writeFile } from '../../utils/file.mjs';
import { UNIST } from '../../utils/queries/index.mjs';
import { stringifyWithout } from '../../utils/unist.mjs';

// Nodes stripped from the simplified output. Filtered during stringification
// rather than removed from the trees: the entries are shared with every other
// generator running off the same metadata.
const EXCLUDED_NODES = [UNIST.isStabilityNode, UNIST.isHeading];

/**
 * Generates the simplified JSON version of the API docs
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input) {
  const config = getConfig('json-simple');

  if (config.output) {
    // Writes all the API docs stringified content into one file
    // Note: The full JSON generator in the future will create one JSON file per top-level API doc file
    await writeFile(
      join(config.output, 'api-docs.json'),
      stringifyWithout(input, EXCLUDED_NODES, config.minify ? undefined : 2)
    );
  }

  return input;
}
