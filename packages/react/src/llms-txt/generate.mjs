'use strict';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import getConfig from '@nodejs/doc-kit/utils/configuration/index.mjs';
import { populate } from '@nodejs/doc-kit/utils/configuration/templates.mjs';
import { writeFile } from '@nodejs/doc-kit/utils/file.mjs';

import { buildApiDocLink } from './utils/buildApiDocLink.mjs';

/**
 * Generates a llms.txt file
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input) {
  const config = getConfig('llms-txt');

  const template = await readFile(config.templatePath, 'utf-8');

  const apiDocsLinks = input
    .filter(entry => entry.heading.depth === 1 && entry.heading.data.text)
    .map(entry => `- ${buildApiDocLink(entry, config)}`)
    .join('\n');

  const filledTemplate = `${populate(template, config)}${apiDocsLinks}`;

  if (config.output) {
    await writeFile(join(config.output, 'llms.txt'), filledTemplate);
  }

  return filledTemplate;
}
