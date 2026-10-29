'use strict';

import { join } from 'node:path';

import { remove } from 'unist-util-remove';

import getConfig from '#utils/configuration/index.mjs';
import { writeJSON } from '#utils/file.mjs';
import { UNIST } from '#utils/queries/index.mjs';

/**
 * Generates the simplified JSON version of the API docs
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input) {
  const config = getConfig('json-simple');

  const output = input.map(entry => {
    const copy = { ...entry, content: structuredClone(entry.content) };

    remove(copy.content, [UNIST.isStabilityNode, UNIST.isHeading]);

    return copy;
  });

  if (config.output) {
    await writeJSON(
      join(config.output, 'api-docs.json'),
      output,
      config.minify
    );
  }

  return output;
}
