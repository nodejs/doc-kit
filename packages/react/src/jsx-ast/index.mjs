'use strict';

import { generate, processChunk } from './generate.mjs';

/**
 * Generator for converting MDAST to JSX AST.
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'jsx-ast',

  description: 'Generates JSX AST from the input MDAST',

  dependsOn: '@doc-kit/core/metadata',

  defaultConfiguration: {
    ref: 'main',
    generateAllPage: true,
    generateNotFoundPage: true,
  },

  hasParallelProcessor: true,

  generate,
  processChunk,
};
