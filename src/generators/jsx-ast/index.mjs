'use strict';

import { createLazyGenerator } from '../../utils/generators.mjs';

/**
 * Generator for converting MDAST to JSX AST.
 *
 * @type {import('./types').Generator}
 */
export default createLazyGenerator({
  name: 'jsx-ast',

  version: '1.0.0',

  description: 'Generates JSX AST from the input MDAST',

  dependsOn: 'metadata',

  defaultConfiguration: {
    ref: 'main',
    remoteConfig:
      'https://raw.githubusercontent.com/nodejs/nodejs.org/main/apps/site/site.json',
  },

  hasParallelProcessor: true,
});
