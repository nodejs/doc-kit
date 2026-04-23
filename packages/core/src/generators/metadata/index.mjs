'use strict';

import { createLazyGenerator } from '../../utils/generators.mjs';

/**
 * This generator generates a flattened list of metadata entries from a API doc
 *
 * @type {import('./types').Generator}
 */
export default createLazyGenerator({
  name: 'metadata',

  version: '1.0.0',

  description: 'generates a flattened list of API doc metadata entries',

  dependsOn: 'ast',

  hasParallelProcessor: true,
});
