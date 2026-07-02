'use strict';

import { NOT_FOUND_DEFAULTS } from './utils/synthetic/404.mjs';
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
    generateAllPage: true,
    generateIndexPage: true,
    generateNotFoundPage: true,
    ...NOT_FOUND_DEFAULTS,
  },

  hasParallelProcessor: true,
});
