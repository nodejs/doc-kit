'use strict';

import { join } from 'node:path';

import { createLazyGenerator } from '../../utils/generators.mjs';

/**
 * This generator generates a man page version of the CLI.md file.
 * See https://man.openbsd.org/mdoc.7 for the formatting.
 *
 * @type {import('./types').Generator}
 */
export default createLazyGenerator({
  name: 'man-page',

  version: '1.0.0',

  description: 'Generates the Node.js man-page.',

  dependsOn: 'metadata',

  defaultConfiguration: {
    fileName: 'node.1',
    cliOptionsHeaderSlug: 'options',
    envVarsHeaderSlug: 'environment-variables-1',
    templatePath: join(import.meta.dirname, 'template.1'),
  },
});
