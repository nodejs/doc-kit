'use strict';

import { join } from 'node:path';

import { createLazyGenerator } from '../../utils/generators.mjs';

/**
 * This generator generates a llms.txt file to provide information to LLMs at
 * inference time
 *
 * @type {import('./types').Generator}
 */
export default createLazyGenerator({
  name: 'llms-txt',

  version: '1.0.0',

  description:
    'Generates a llms.txt file to provide information to LLMs at inference time',

  dependsOn: 'metadata',

  defaultConfiguration: {
    templatePath: join(import.meta.dirname, 'template.txt'),
    pageURL: '{baseURL}/latest/api{path}.md',
  },
});
