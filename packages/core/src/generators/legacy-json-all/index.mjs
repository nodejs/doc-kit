'use strict';

import { generate } from './generate.mjs';

/**
 * This generator consolidates data from the `legacy-json` generator into a single
 * JSON file (`all.json`).
 *
 * @type {import('./types.d.ts').Generator}
 */
export default {
  name: 'legacy-json-all',

  description:
    'Generates the `all.json` file from the `legacy-json` generator, which includes all the modules in one single file.',

  dependsOn: '@node-core/doc-kit/legacy-json',

  defaultConfiguration: {
    minify: false,
  },

  generate,
};
