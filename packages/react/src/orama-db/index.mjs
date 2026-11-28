'use strict';

import { generate } from './generate.mjs';

/**
 * This generator is responsible for generating the Orama database for the
 * API docs.
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'orama-db',

  description: 'Generates the Orama database for the API docs.',

  dependsOn: '@doc-kit/core/metadata',

  generate,
};
