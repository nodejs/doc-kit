'use strict';

import { createLazyGenerator } from '../../utils/generators.mjs';

/**
 * Generator for converting MDAST to JSX AST.
 *
 * @type {import('./types').Generator}
 */
export default createLazyGenerator({
  name: 'jsx-ast',

  description: 'Generates JSX AST from the input MDAST',

  dependsOn: 'metadata',

  defaultConfiguration: {
    ref: 'main',
    generateAllPage: true,
    generateIndexPage: true,
    generateNotFoundPage: true,
  },

  hasParallelProcessor: true,
});
