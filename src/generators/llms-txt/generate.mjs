'use strict';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { buildApiDocLink } from './utils/buildApiDocLink.mjs';
import getConfig from '../../utils/configuration/index.mjs';
import { writeFile } from '../../utils/file.mjs';

/**
 * Generates a llms.txt file
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input) {
  const config = getConfig('llms-txt');

  const template = await readFile(config.templatePath, 'utf-8');

  const apiDocsLinks = input
    .filter(entry => entry.heading.depth === 1)
    .map(entry => `- ${buildApiDocLink(entry, config)}`)
    .join('\n');

  const filledTemplate = `${template}${apiDocsLinks}`;

  if (config.output) {
    await writeFile(join(config.output, 'llms.txt'), filledTemplate);
  }

  return filledTemplate;
}
