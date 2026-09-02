'use strict';

import { SCHEMA_URL } from './constants.mjs';
import { generate, processChunk } from './generate.mjs';

/**
 * This generator turns each API doc into a JSON document
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'json',

  description:
    'Generates one JSON document per API doc, described by the doc-kit JSON schema',

  dependsOn: '@doc-kit/core/metadata',

  defaultConfiguration: {
    schemaURL: SCHEMA_URL,
  },

  hasParallelProcessor: true,

  generate,
  processChunk,
};
