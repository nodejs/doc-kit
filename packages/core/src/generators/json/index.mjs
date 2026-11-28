'use strict';

import { SCHEMA_URL, SCHEMA_VERSION } from './constants.mjs';
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

  incremental: { salt: [SCHEMA_VERSION] },

  markdown: {
    remarkPlugins: [
      '#plugins/type-annotations/remark.mjs',
      'remark-gfm',
      'remark-stringify',
      '...',
    ],
  },

  generate,
  processChunk,
};
