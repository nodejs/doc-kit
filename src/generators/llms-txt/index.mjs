import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { buildApiDocLink } from './utils/buildApiDocLink.mjs';
import getConfig from '../../utils/configuration/index.mjs';

/**
 * This generator generates a llms.txt file to provide information to LLMs at
 * inference time
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'llms-txt',

  version: '1.0.0',

  description:
    'Generates a llms.txt file to provide information to LLMs at inference time',

  dependsOn: 'metadata',

  defaultConfiguration: {
    templatePath: join(import.meta.dirname, 'template.txt'),
  },

  /**
   * Generates a llms.txt file
   */
  async generate(input) {
    const config = getConfig('llms-txt');

    const template = await readFile(config.templatePath, 'utf-8');

    const apiDocsLinks = input
      .filter(entry => entry.heading.depth === 1)
      .map(entry => `- ${buildApiDocLink(entry, config.baseURL)}`)
      .join('\n');

    const filledTemplate = `${template}${apiDocsLinks}`;

    if (config.output) {
      await writeFile(join(config.output, 'llms.txt'), filledTemplate);
    }

    return filledTemplate;
  },
};
