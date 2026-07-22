'use strict';

import { createLazyGenerator } from '../../utils/generators.mjs';

/**
 * This generator is responsible for generating the Orama database for the
 * API docs. It is based on the legacy-json generator.
 *
 * @type {import('./types').Generator}
 */
export default createLazyGenerator({
  name: 'orama-db',

  description: 'Generates the Orama database for the API docs.',

  dependsOn: 'metadata',
});
