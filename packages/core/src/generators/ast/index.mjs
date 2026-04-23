'use strict';

import { createLazyGenerator } from '../../utils/generators.mjs';

/**
 * This generator parses Markdown API doc files into AST trees.
 * It parallelizes the parsing across worker threads for better performance.
 *
 * @type {import('./types').Generator}
 */
export default createLazyGenerator({
  name: 'ast',

  version: '1.0.0',

  description: 'Parses Markdown API doc files into AST trees',

  hasParallelProcessor: true,
});
