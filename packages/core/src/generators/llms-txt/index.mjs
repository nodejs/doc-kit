'use strict';

import { join } from 'node:path';

import { generate } from './generate.mjs';

/**
 * This generator generates a llms.txt file to provide information to LLMs at
 * inference time
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'llms-txt',

  description:
    'Generates a llms.txt file to provide information to LLMs at inference time',

  dependsOn: '@node-core/doc-kit/metadata',

  defaultConfiguration: {
    templatePath: join(import.meta.dirname, 'template.txt'),
    pageURL: '{baseURL}/latest/api{path}.md',
  },

  generate,
};
