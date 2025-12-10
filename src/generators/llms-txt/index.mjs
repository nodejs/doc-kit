import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { buildApiDocLink } from './utils/buildApiDocLink.mjs';

/**
 * This generator generates a llms.txt file to provide information to LLMs at
 * inference time
 *
 * @typedef {Array<ApiDocMetadataEntry>} Input
 *
 * @type {GeneratorMetadata<Input, string>}
 */
export default {
  name: 'llms-txt',

  version: '1.0.0',

  description:
    'Generates a llms.txt file to provide information to LLMs at inference time',

  dependsOn: 'metadata',

  /**
   * Generates a llms.txt file
   *
   * @param {Input} input
   * @param {Partial<GeneratorOptions>} options
   * @returns {Promise<void>}
   */
  async generate(input, { output }) {
    const template = await readFile(
      join(import.meta.dirname, 'template.txt'),
      'utf-8'
    );

    const apiDocsLinks = input
      .filter(entry => entry.heading.depth === 1)
      .map(entry => `- ${buildApiDocLink(entry)}`)
      .join('\n');

    const filledTemplate = `${template}${apiDocsLinks}`;

    if (output) {
      await writeFile(join(output, 'llms.txt'), filledTemplate);
    }

    return filledTemplate;
  },
};
