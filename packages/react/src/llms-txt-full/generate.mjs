'use strict';

import { join } from 'node:path';

import getConfig from '@doc-kit/core/utils/configuration/index.mjs';
import { populate } from '@doc-kit/core/utils/configuration/templates.mjs';
import { writeFile } from '@doc-kit/core/utils/file.mjs';

import { buildPages } from './utils/buildPages.mjs';

/**
 * Generates a llms-full.txt file
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input) {
  const config = getConfig('llms-txt-full');

  const full = buildPages(input)
    .map(
      ({ path, markdown }) =>
        `---\nurl: ${populate(config.pageURL, { ...config, path })}\n---\n${markdown}`
    )
    .join('\n');

  if (config.output) {
    await writeFile(join(config.output, 'llms-full.txt'), full);
  }

  return full;
}
