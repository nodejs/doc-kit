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

  dependsOn: '@nodejs/doc-kit/metadata',

  defaultConfiguration: {
    ref: 'main',
    generateAllPage: false,
    generateIndexPage: true,
    generateNotFoundPage: true,
  },

  hasParallelProcessor: true,

  generate,
  processChunk,
};
