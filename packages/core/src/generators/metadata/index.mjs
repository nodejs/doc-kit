'use strict';

import { generate, processChunk } from './generate.mjs';

/**
 * This generator generates a flattened list of metadata entries from a API doc
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'metadata',

  description: 'generates a flattened list of API doc metadata entries',

  dependsOn: '@doc-kit/core/ast',

  hasParallelProcessor: true,

  markdown: {
    remarkPlugins: [
      'remark-parse',
      '#plugins/type-annotations/remark.mjs',
      'remark-gfm',
      '...',
    ],
  },

  generate,
  processChunk,
};
