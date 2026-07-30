'use strict';

import { generate } from './generate.mjs';

/**
 * This generator is responsible for generating the Orama database for the
 * API docs. It is based on the legacy-json generator.
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'orama-db',

  description: 'Generates the Orama database for the API docs.',

  dependsOn: '@node-core/doc-kit/metadata',

  generate,
};
