'use strict';

import { SCHEMA_URL } from './constants.mjs';
import { generate } from './generate.mjs';

/**
 * This generator bundles the documents of the `json` generator into a single
 * `all.json` file
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'json-all',

  description:
    'Bundles the documents of the `json` generator into a single `all.json` file',

  dependsOn: '@doc-kit/core/json',

  defaultConfiguration: {
    schemaURL: SCHEMA_URL,
  },

  generate,
};
