'use strict';

import { generate, processChunk } from './generate.mjs';

/**
 * This generator parses Markdown API doc files into AST trees.
 * It parallelizes the parsing across worker threads for better performance.
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'ast',

  description: 'Parses Markdown API doc files into AST trees',

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
